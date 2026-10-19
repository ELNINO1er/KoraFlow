"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { resolveSession, type AuthContext } from "@/server/auth/context";
import * as contractService from "@/server/services/contract-service";
import { ContractError } from "@/server/services/contract-service";
import { PermissionError } from "@/server/permissions/permissions";
import { unknownVariables } from "@/lib/contracts/variables";

const templateSchema = z.object({
  name: z.string().trim().min(3, "Nom trop court.").max(160),
  body: z.string().trim().min(20, "Le corps du modèle est trop court.").max(30_000),
});

export type TemplatePayload = z.input<typeof templateSchema>;

async function getContext(): Promise<AuthContext> {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "suspended") redirect("/compte-suspendu");
  if (session.status === "no-organization") redirect("/create-organization");
  return session.context;
}

/** Validation partagée : refuse les variables hors catalogue (anti-trou silencieux). */
function validateTemplateBody(body: string): string | null {
  const unknown = unknownVariables(body);
  if (unknown.length) {
    return `Variables inconnues dans le modèle : ${unknown.map((k) => `{{${k}}}`).join(", ")}. Utilisez uniquement les variables proposées.`;
  }
  return null;
}

export async function createTemplateAction(
  payload: TemplatePayload,
): Promise<{ ok: boolean; id?: string; error?: string }> {
  const ctx = await getContext();
  const parsed = templateSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const invalid = validateTemplateBody(parsed.data.body);
  if (invalid) return { ok: false, error: invalid };
  try {
    const created = await contractService.createContractTemplate(ctx, parsed.data);
    revalidatePath("/contrats/modeles");
    return { ok: true, id: created.id };
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    if (e instanceof ContractError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function updateTemplateAction(
  id: string,
  payload: TemplatePayload,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getContext();
  const parsed = templateSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données invalides." };
  const invalid = validateTemplateBody(parsed.data.body);
  if (invalid) return { ok: false, error: invalid };
  try {
    await contractService.updateContractTemplate(ctx, id, parsed.data);
    revalidatePath("/contrats/modeles");
    revalidatePath(`/contrats/modeles/${id}`);
    return { ok: true };
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    if (e instanceof ContractError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function duplicateTemplateAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getContext();
  try {
    await contractService.duplicateContractTemplate(ctx, id);
    revalidatePath("/contrats/modeles");
    return { ok: true };
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    if (e instanceof ContractError) return { ok: false, error: e.message };
    throw e;
  }
}

export async function archiveTemplateAction(id: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getContext();
  try {
    await contractService.archiveContractTemplate(ctx, id);
    revalidatePath("/contrats/modeles");
    return { ok: true };
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    if (e instanceof ContractError) return { ok: false, error: e.message };
    throw e;
  }
}
