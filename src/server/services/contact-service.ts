import "server-only";
import type { ContactStage } from "@prisma/client";
import type { AuthContext } from "../auth/context";
import { assertCan } from "../permissions/permissions";
import { prisma } from "../database/client";
import * as contacts from "../repositories/contact-repository";
import type {
  CreateContactInput,
  UpdateContactInput,
} from "@/lib/validation/contact";

/**
 * Couche service des contacts.
 * Applique les CONTRÔLES DE PERMISSION (rôle) et enrichit les opérations
 * (historique d'activités, audit). Toute lecture/écriture est scopée à
 * `ctx.organizationId` via la couche repository.
 */

export async function listContacts(
  ctx: AuthContext,
  params: contacts.ContactListParams,
) {
  assertCan(ctx.role, "contacts.view");
  return contacts.listContacts(ctx.organizationId, params);
}

export async function getContact(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "contacts.view");
  const contact = await contacts.getContactById(ctx.organizationId, id);
  if (!contact) return null;
  const activities = await contacts.listActivities(ctx.organizationId, id);
  return { contact, activities };
}

export async function createContact(ctx: AuthContext, input: CreateContactInput) {
  assertCan(ctx.role, "contacts.create");

  const contact = await contacts.createContact(ctx.organizationId, input);

  await contacts.createActivity(ctx.organizationId, {
    contactId: contact.id,
    type: "CREATED",
    actorUserId: ctx.user.id,
  });
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      action: "contact.created",
      targetType: "Contact",
      targetId: contact.id,
    },
  });

  return contact;
}

export async function updateContact(
  ctx: AuthContext,
  id: string,
  input: UpdateContactInput,
) {
  assertCan(ctx.role, "contacts.update");

  const existing = await contacts.getContactById(ctx.organizationId, id);
  if (!existing) return null;

  const updated = await contacts.updateContact(ctx.organizationId, id, input);
  if (!updated) return null;

  // Journalise un changement d'étape du pipeline s'il a eu lieu.
  if (input.stage && input.stage !== existing.stage) {
    await contacts.createActivity(ctx.organizationId, {
      contactId: id,
      type: "STAGE_CHANGED",
      actorUserId: ctx.user.id,
      metadata: { from: existing.stage, to: input.stage },
    });
  }

  return updated;
}

export async function changeStage(
  ctx: AuthContext,
  id: string,
  stage: ContactStage,
) {
  return updateContact(ctx, id, { stage });
}

export async function addNote(ctx: AuthContext, contactId: string, content: string) {
  assertCan(ctx.role, "contacts.update");
  const contact = await contacts.getContactById(ctx.organizationId, contactId);
  if (!contact) return null;
  return contacts.createActivity(ctx.organizationId, {
    contactId,
    type: "NOTE",
    content,
    actorUserId: ctx.user.id,
  });
}

export async function deleteContact(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "contacts.delete");
  const ok = await contacts.softDeleteContact(ctx.organizationId, id);
  if (ok) {
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        actorUserId: ctx.user.id,
        action: "contact.deleted",
        targetType: "Contact",
        targetId: id,
      },
    });
  }
  return ok;
}
