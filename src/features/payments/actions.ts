"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { PaymentMethod } from "@prisma/client";
import { z } from "zod";
import { resolveSession, type AuthContext } from "@/server/auth/context";
import * as paymentService from "@/server/services/payment-service";

async function getContext(): Promise<AuthContext> {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "suspended") redirect("/compte-suspendu");
  if (session.status === "no-organization") redirect("/create-organization");
  return session.context;
}

export async function confirmPaymentAction(id: string) {
  const ctx = await getContext();
  const result = await paymentService.confirmPayment(ctx, id);
  revalidatePath("/factures");
  return result;
}

export async function rejectPaymentAction(id: string) {
  const ctx = await getContext();
  const result = await paymentService.rejectPayment(ctx, id);
  revalidatePath("/factures");
  return result;
}

export async function recordPaymentAction(input: {
  invoiceId: string;
  amountMinor: number;
  method: PaymentMethod;
  reference?: string;
}) {
  const ctx = await getContext();
  const parsed = z.object({
    invoiceId: z.string().min(1),
    amountMinor: z.number().int().positive().max(2_147_483_647),
    method: z.enum(["WAVE", "ORANGE_MONEY", "MTN", "MOOV", "BANK_TRANSFER", "CASH", "OTHER"]),
    reference: z.string().trim().max(160).optional(),
  }).safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Paiement invalide." };
  const result = await paymentService.recordPayment(ctx, parsed.data.invoiceId, {
    amountMinor: parsed.data.amountMinor,
    method: parsed.data.method,
    reference: parsed.data.reference,
  });
  revalidatePath(`/factures/${input.invoiceId}`);
  return result;
}
