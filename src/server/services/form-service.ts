import "server-only";
import { randomBytes } from "node:crypto";
import type { FormFieldType } from "@prisma/client";
import type { AuthContext } from "../auth/context";
import { assertCan } from "../permissions/permissions";
import { prisma } from "../database/client";
import * as forms from "../repositories/form-repository";
import { slugify } from "@/lib/formatting/slug";
import { mapSubmissionToContact } from "@/lib/forms/mapping";
import { notifyOrg } from "./notification-service";

export async function listForms(ctx: AuthContext) {
  assertCan(ctx.role, "forms.view");
  return forms.listForms(ctx.organizationId);
}

export async function getForm(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "forms.view");
  return forms.getFormById(ctx.organizationId, id);
}

export async function listSubmissions(ctx: AuthContext, formId: string) {
  assertCan(ctx.role, "forms.view");
  return forms.listSubmissions(ctx.organizationId, formId);
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "formulaire";
  let candidate = root;
  let n = 2;
  while (await forms.slugExists(candidate)) {
    candidate = `${root}-${n}`;
    n += 1;
  }
  return candidate;
}

export async function createForm(ctx: AuthContext, input: { name: string; description?: string }) {
  assertCan(ctx.role, "forms.create");
  const slug = await uniqueSlug(input.name);
  const form = await forms.createForm(ctx.organizationId, {
    name: input.name,
    slug,
    description: input.description,
    createdById: ctx.user.id,
  });
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      action: "form.created",
      targetType: "Form",
      targetId: form.id,
    },
  });
  return form;
}

export async function addField(
  ctx: AuthContext,
  formId: string,
  data: { label: string; type: FormFieldType; required?: boolean; placeholder?: string; options?: string[] },
) {
  assertCan(ctx.role, "forms.update");
  return forms.addField(ctx.organizationId, formId, data);
}

export async function deleteField(ctx: AuthContext, fieldId: string) {
  assertCan(ctx.role, "forms.update");
  return forms.deleteField(ctx.organizationId, fieldId);
}

export async function deleteForm(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "forms.delete");
  return forms.softDeleteForm(ctx.organizationId, id);
}

/**
 * Soumission PUBLIQUE d'un formulaire : crée un prospect + la soumission.
 * `values` est indexé par identifiant de champ. Un champ honeypot rempli
 * (anti-spam) fait échouer silencieusement.
 */
export async function submitPublicForm(
  slug: string,
  values: Record<string, string>,
  options: { ipAddress?: string; honeypot?: string } = {},
): Promise<{ ok: boolean; error?: string }> {
  if (options.honeypot && options.honeypot.trim() !== "") {
    return { ok: true }; // piège anti-spam : on ignore silencieusement
  }

  const form = await forms.getFormBySlug(slug);
  if (!form) return { ok: false, error: "Formulaire indisponible." };

  // Validation des champs requis.
  for (const field of form.fields) {
    if (field.required && !(values[field.id] ?? "").trim()) {
      return { ok: false, error: `Le champ « ${field.label} » est requis.` };
    }
  }

  // Mapping des réponses vers un prospect (logique pure et testée).
  const mapped = mapSubmissionToContact(
    form.fields.map((f) => ({ id: f.id, label: f.label, type: f.type })),
    values,
  );
  const organizationId = form.organizationId;

  await prisma.$transaction(async (tx) => {
    const contact = await tx.contact.create({
      data: {
        organizationId,
        type: "PROSPECT",
        stage: "NEW_REQUEST",
        firstName: mapped.firstName,
        email: mapped.email,
        phone: mapped.phone,
        companyName: mapped.companyName,
        source: `Formulaire : ${form.name}`,
        portalToken: randomBytes(24).toString("hex"),
      },
    });
    await tx.formSubmission.create({
      data: { organizationId, formId: form.id, contactId: contact.id, data: mapped.data, ipAddress: options.ipAddress },
    });
    await tx.contactActivity.create({
      data: { organizationId, contactId: contact.id, type: "CREATED", content: `Prospect créé depuis le formulaire « ${form.name} »` },
    });
    await tx.auditLog.create({
      data: { organizationId, action: "form.submitted", targetType: "Form", targetId: form.id, metadata: { contactId: contact.id } },
    });
  });

  await notifyOrg(organizationId, {
    type: "form.submitted",
    title: `Nouvelle demande via « ${form.name} »`,
    body: mapped.firstName,
    link: "/clients",
  });

  return { ok: true };
}
