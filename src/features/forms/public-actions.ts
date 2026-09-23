"use server";

import { headers } from "next/headers";
import { submitPublicForm } from "@/server/services/form-service";

/**
 * Soumission publique d'un formulaire (aucune authentification).
 * Les valeurs sont indexées par identifiant de champ ; `_website` est le
 * champ honeypot anti-spam.
 */
export async function submitFormAction(
  slug: string,
  values: Record<string, string>,
  honeypot: string,
): Promise<{ ok: boolean; error?: string }> {
  const h = await headers();
  const ipAddress =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || undefined;

  return submitPublicForm(slug, values, { ipAddress: ipAddress ?? undefined, honeypot });
}
