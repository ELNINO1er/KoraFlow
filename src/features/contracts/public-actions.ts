"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guardPublicMutation } from "@/lib/security/public-mutation";
import { signContractByToken } from "@/server/services/contract-service";

/**
 * Signature du contrat par le client via son jeton public (aucune auth).
 * Capture l'IP et le user-agent depuis la requête pour la piste d'audit.
 */
export async function signContractAction(
  token: string,
  signerName: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = z.object({
    token: z.string(),
    signerName: z.string().trim().min(2).max(120),
  }).safeParse({ token, signerName });
  if (!parsed.success) return { ok: false, error: "Informations de signature invalides." };

  const guard = guardPublicMutation({
    scope: "contract-signature",
    token: parsed.data.token,
    headers: await headers(),
  });
  if (!guard.ok) return guard;

  const result = await signContractByToken(parsed.data.token, {
    signerName: parsed.data.signerName,
    ipAddress: guard.ipAddress,
    userAgent: guard.userAgent,
  });

  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath(`/c/${parsed.data.token}`);
  return { ok: true };
}
