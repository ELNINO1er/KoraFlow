"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { FormFieldType } from "@prisma/client";
import { resolveSession, type AuthContext } from "@/server/auth/context";
import * as formService from "@/server/services/form-service";
import { PermissionError } from "@/server/permissions/permissions";

async function getContext(): Promise<AuthContext> {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "no-organization") redirect("/create-organization");
  return session.context;
}

export interface FormState {
  error: string | null;
}

export async function createFormAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const ctx = await getContext();
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || undefined;
  if (name.length < 2) return { error: "Le nom du formulaire est requis." };

  let form;
  try {
    form = await formService.createForm(ctx, { name, description });
  } catch (e) {
    if (e instanceof PermissionError) return { error: "Permission insuffisante." };
    throw e;
  }
  redirect(`/formulaires/${form.id}`);
}

export async function addFieldAction(input: {
  formId: string;
  label: string;
  type: FormFieldType;
  required: boolean;
}): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getContext();
  if (input.label.trim().length < 1) return { ok: false, error: "Libellé requis." };
  try {
    const field = await formService.addField(ctx, input.formId, {
      label: input.label.trim(),
      type: input.type,
      required: input.required,
    });
    if (!field) return { ok: false, error: "Formulaire introuvable." };
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    throw e;
  }
  revalidatePath(`/formulaires/${input.formId}`);
  return { ok: true };
}

export async function deleteFieldAction(fieldId: string, formId: string) {
  const ctx = await getContext();
  try {
    await formService.deleteField(ctx, fieldId);
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath(`/formulaires/${formId}`);
}

export async function deleteFormAction(id: string) {
  const ctx = await getContext();
  try {
    await formService.deleteForm(ctx, id);
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath("/formulaires");
  redirect("/formulaires");
}
