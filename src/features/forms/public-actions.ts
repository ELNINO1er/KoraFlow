"use server";

import { headers } from "next/headers";
import { submitPublicForm } from "@/server/services/form-service";
import { rateLimit } from "@/lib/security/rate-limit";

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

  // Anti-abus : 5 soumissions / minute / IP / formulaire.
  const rl = rateLimit(`form:${ipAddress ?? "unknown"}:${slug}`, 5, 60_000);
  if (!rl.ok) {
    return { ok: false, error: "Trop de tentatives. Réessayez dans un instant." };
  }

  return submitPublicForm(slug, values, { ipAddress: ipAddress ?? undefined, honeypot });
}
