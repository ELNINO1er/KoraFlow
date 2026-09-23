"use server";

import { revalidatePath } from "next/cache";
import type { PaymentMethod } from "@prisma/client";
import { declarePaymentByToken } from "@/server/services/payment-service";

/**
 * Déclaration d'un paiement par le client via le jeton public de la facture.
 * `amountMinor` est déjà converti côté client selon la devise de la facture.
 */
export async function declarePaymentAction(
  token: string,
  input: { amountMinor: number; method: PaymentMethod; reference?: string },
): Promise<{ ok: boolean; error?: string }> {
  const result = await declarePaymentByToken(token, {
    amountMinor: input.amountMinor,
    method: input.method,
    reference: input.reference,
  });
  if (!result.ok) return { ok: false, error: result.error };
  revalidatePath(`/i/${token}`);
  return { ok: true };
}
