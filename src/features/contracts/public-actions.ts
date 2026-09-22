"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { signContractByToken } from "@/server/services/contract-service";

/**
 * Signature du contrat par le client via son jeton public (aucune auth).
 * Capture l'IP et le user-agent depuis la requête pour la piste d'audit.
 */
export async function signContractAction(
  token: string,
  signerName: string,
): Promise<{ ok: boolean; error?: string }> {
  const h = await headers();
  const ipAddress =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    h.get("x-real-ip") ||
    undefined;
  const userAgent = h.get("user-agent") ?? undefined;

  const result = await signContractByToken(token, {
    signerName,
    ipAddress: ipAddress ?? undefined,
    userAgent,
  });

  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath(`/c/${token}`);
  return { ok: true };
}
