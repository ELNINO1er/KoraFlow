"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ContactStage } from "@prisma/client";
import { resolveSession, type AuthContext } from "@/server/auth/context";
import * as contactService from "@/server/services/contact-service";
import { createContactSchema } from "@/lib/validation/contact";
import { PermissionError } from "@/server/permissions/permissions";

/** Récupère le contexte authentifié ou redirige. */
async function getContext(): Promise<AuthContext> {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "no-organization") redirect("/create-organization");
  return session.context;
}

export interface ContactFormState {
  error: string | null;
  fieldErrors?: Record<string, string>;
}

export async function createContactAction(
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const ctx = await getContext();

  const parsed = createContactSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    companyName: formData.get("companyName"),
    source: formData.get("source"),
    notes: formData.get("notes"),
    type: formData.get("type") || undefined,
    stage: formData.get("stage") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return { error: "Veuillez corriger les champs indiqués.", fieldErrors };
  }

  try {
    await contactService.createContact(ctx, parsed.data);
  } catch (e) {
    if (e instanceof PermissionError) {
      return { error: "Vous n'avez pas la permission de créer un contact." };
    }
    throw e;
  }

  revalidatePath("/clients");
  redirect("/clients");
}

export async function updateContactAction(
  id: string,
  _prev: ContactFormState,
  formData: FormData,
): Promise<ContactFormState> {
  const ctx = await getContext();

  const parsed = createContactSchema.safeParse({
    firstName: formData.get("firstName"),
    lastName: formData.get("lastName"),
    email: formData.get("email"),
    phone: formData.get("phone"),
    companyName: formData.get("companyName"),
    source: formData.get("source"),
    notes: formData.get("notes"),
    type: formData.get("type") || undefined,
    stage: formData.get("stage") || undefined,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: "Veuillez corriger les champs indiqués.", fieldErrors };
  }

  try {
    const updated = await contactService.updateContact(ctx, id, parsed.data);
    if (!updated) return { error: "Contact introuvable." };
  } catch (e) {
    if (e instanceof PermissionError) return { error: "Vous n'avez pas la permission de modifier ce contact." };
    throw e;
  }

  revalidatePath(`/clients/${id}`);
  redirect(`/clients/${id}`);
}

export async function convertContactAction(id: string) {
  const ctx = await getContext();
  try {
    await contactService.updateContact(ctx, id, { type: "CLIENT", stage: "CONVERTED" });
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath(`/clients/${id}`);
  revalidatePath("/clients");
}

export async function changeContactStageAction(id: string, stage: ContactStage) {
  const ctx = await getContext();
  try {
    await contactService.changeStage(ctx, id, stage);
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath("/clients");
  revalidatePath(`/clients/${id}`);
}

export async function deleteContactAction(id: string) {
  const ctx = await getContext();
  try {
    await contactService.deleteContact(ctx, id);
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath("/clients");
  redirect("/clients");
}

export async function addNoteAction(contactId: string, content: string) {
  const ctx = await getContext();
  const trimmed = content.trim();
  if (trimmed === "") return;
  try {
    await contactService.addNote(ctx, contactId, trimmed);
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath(`/clients/${contactId}`);
}
