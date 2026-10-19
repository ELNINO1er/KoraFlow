"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { resolveSession, type AuthContext } from "@/server/auth/context";
import { PermissionError } from "@/server/permissions/permissions";
import { commitContactImport, type ContactImportResult } from "@/server/services/contacts-excel";

async function getContext(): Promise<AuthContext> {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "suspended") redirect("/compte-suspendu");
  if (session.status === "no-organization") redirect("/create-organization");
  return session.context;
}

const commitSchema = z.object({
  previewId: z.string().regex(/^[a-f0-9]{36}$/, "Aperçu invalide."),
  idempotencyKey: z.string().min(8).max(100),
  mapping: z.record(z.string(), z.number().int().min(0)).optional(),
  preferredSheet: z.string().optional(),
});

export async function commitContactsImportAction(
  input: z.input<typeof commitSchema>,
): Promise<{ ok: boolean; error?: string; result?: ContactImportResult }> {
  const ctx = await getContext();
  const parsed = commitSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Paramètres d'import invalides." };
  try {
    const res = await commitContactImport(ctx, parsed.data);
    if (!res.ok) return { ok: false, error: res.error };
    revalidatePath("/clients");
    return { ok: true, result: res.result };
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: "Permission d'import insuffisante." };
    throw e;
  }
}
