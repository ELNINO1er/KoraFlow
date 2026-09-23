"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { PaymentMethod } from "@prisma/client";
import { resolveSession, type AuthContext } from "@/server/auth/context";
import * as paymentService from "@/server/services/payment-service";

async function getContext(): Promise<AuthContext> {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
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
  const result = await paymentService.recordPayment(ctx, input.invoiceId, {
    amountMinor: input.amountMinor,
    method: input.method,
    reference: input.reference,
  });
  revalidatePath(`/factures/${input.invoiceId}`);
  return result;
}
