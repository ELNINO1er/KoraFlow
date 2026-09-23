import type { FormFieldType, Prisma } from "@prisma/client";
import { prisma } from "../database/client";

/**
 * Couche d'accès aux formulaires — enforcement multi-tenant. L'accès public par
 * `slug` n'est pas scopé (le slug est l'URL publique du formulaire).
 */

export function createForm(
  organizationId: string,
  data: { name: string; slug: string; description?: string; createdById?: string },
) {
  return prisma.form.create({
    data: {
      organizationId,
      name: data.name,
      slug: data.slug,
      description: data.description,
      createdById: data.createdById,
    },
  });
}

export function slugExists(slug: string) {
  return prisma.form.findUnique({ where: { slug }, select: { id: true } });
}

export async function listForms(organizationId: string) {
  return prisma.form.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { submissions: true } } },
  });
}

export function getFormById(organizationId: string, id: string) {
  return prisma.form.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: {
      fields: { orderBy: { position: "asc" } },
      _count: { select: { submissions: true } },
    },
  });
}

/** Accès PUBLIC par slug (formulaire actif). */
export function getFormBySlug(slug: string) {
  return prisma.form.findFirst({
    where: { slug, active: true, deletedAt: null },
    include: {
      fields: { orderBy: { position: "asc" } },
      organization: { select: { name: true } },
    },
  });
}

export async function addField(
  organizationId: string,
  formId: string,
  data: {
    label: string;
    type: FormFieldType;
    required?: boolean;
    placeholder?: string;
    options?: string[];
  },
) {
  const form = await prisma.form.findFirst({
    where: { id: formId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!form) return null;

  const last = await prisma.formField.findFirst({
    where: { organizationId, formId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  return prisma.formField.create({
    data: {
      organizationId,
      formId,
      label: data.label,
      type: data.type,
      required: data.required ?? false,
      placeholder: data.placeholder,
      options: data.options ?? [],
      position: (last?.position ?? -1) + 1,
    },
  });
}

export async function deleteField(organizationId: string, fieldId: string) {
  const result = await prisma.formField.deleteMany({ where: { id: fieldId, organizationId } });
  return result.count > 0;
}

export async function softDeleteForm(organizationId: string, id: string) {
  const result = await prisma.form.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count > 0;
}

export function createSubmission(
  organizationId: string,
  data: { formId: string; contactId?: string | null; data: Prisma.InputJsonValue; ipAddress?: string },
) {
  return prisma.formSubmission.create({
    data: {
      organizationId,
      formId: data.formId,
      contactId: data.contactId ?? null,
      data: data.data,
      ipAddress: data.ipAddress,
    },
  });
}

export function listSubmissions(organizationId: string, formId: string) {
  return prisma.formSubmission.findMany({
    where: { organizationId, formId },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: { contact: { select: { id: true, firstName: true, lastName: true } } },
  });
}
