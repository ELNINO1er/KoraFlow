"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveSession, type AuthContext } from "@/server/auth/context";
import * as apptService from "@/server/services/appointment-service";
import { PermissionError } from "@/server/permissions/permissions";

async function getContext(): Promise<AuthContext> {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "no-organization") redirect("/create-organization");
  return session.context;
}

export interface TypeFormState {
  error: string | null;
}

export async function createTypeAction(_prev: TypeFormState, formData: FormData): Promise<TypeFormState> {
  const ctx = await getContext();
  const name = String(formData.get("name") ?? "").trim();
  const durationMinutes = Number(formData.get("durationMinutes") ?? "30") || 30;
  const description = String(formData.get("description") ?? "").trim() || undefined;
  if (name.length < 2) return { error: "Le nom du type de rendez-vous est requis." };

  let type;
  try {
    type = await apptService.createType(ctx, { name, durationMinutes, description });
  } catch (e) {
    if (e instanceof PermissionError) return { error: "Permission insuffisante." };
    throw e;
  }
  redirect(`/rendez-vous/${type.id}`);
}

export async function setAvailabilityAction(
  typeId: string,
  windows: { dayOfWeek: number; startMinutes: number; endMinutes: number }[],
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getContext();
  try {
    const done = await apptService.setAvailability(ctx, typeId, windows);
    if (!done) return { ok: false, error: "Type introuvable." };
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    throw e;
  }
  revalidatePath(`/rendez-vous/${typeId}`);
  return { ok: true };
}

export async function deleteTypeAction(id: string) {
  const ctx = await getContext();
  try {
    await apptService.deleteType(ctx, id);
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath("/rendez-vous");
  redirect("/rendez-vous");
}
