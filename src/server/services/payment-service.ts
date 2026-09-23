import "server-only";
import type { PaymentMethod } from "@prisma/client";
import type { AuthContext } from "../auth/context";
import { assertCan } from "../permissions/permissions";
import { prisma } from "../database/client";
import * as payments from "../repositories/payment-repository";
import {
  getInvoiceByToken,
  recomputeInvoicePayment,
} from "../repositories/invoice-repository";
import { ensureProjectForInvoice } from "./project-service";

export class PaymentError extends Error {}

/** Confirme (valide) un paiement en attente, puis rapproche la facture. */
export async function confirmPayment(ctx: AuthContext, paymentId: string) {
  assertCan(ctx.role, "payments.update");
  const payment = await payments.getPaymentById(ctx.organizationId, paymentId);
  if (!payment) return { ok: false as const, error: "Paiement introuvable." };

  const done = await payments.confirmPayment(ctx.organizationId, paymentId, ctx.user.id);
  if (!done) return { ok: false as const, error: "Paiement déjà traité." };

  const invoice = await recomputeInvoicePayment(ctx.organizationId, payment.invoiceId);
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      action: "payment.confirmed",
      targetType: "Payment",
      targetId: paymentId,
      metadata: { invoiceId: payment.invoiceId, amountMinor: payment.amountMinor },
    },
  });

  // Facture soldée -> création automatique du projet (idempotente).
  if (invoice?.status === "PAID") {
    await ensureProjectForInvoice(ctx.organizationId, payment.invoiceId, ctx.user.id);
  }
  return { ok: true as const };
}

/** Rejette un paiement en attente. */
export async function rejectPayment(ctx: AuthContext, paymentId: string) {
  assertCan(ctx.role, "payments.update");
  const payment = await payments.getPaymentById(ctx.organizationId, paymentId);
  if (!payment) return { ok: false as const, error: "Paiement introuvable." };

  const done = await payments.rejectPayment(ctx.organizationId, paymentId);
  if (!done) return { ok: false as const, error: "Paiement déjà traité." };

  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      action: "payment.rejected",
      targetType: "Payment",
      targetId: paymentId,
    },
  });
  return { ok: true as const };
}

/** Enregistre directement un paiement CONFIRMÉ (saisie interne d'un encaissement). */
export async function recordPayment(
  ctx: AuthContext,
  invoiceId: string,
  data: { amountMinor: number; method: PaymentMethod; reference?: string; note?: string },
) {
  assertCan(ctx.role, "payments.create");
  if (data.amountMinor <= 0) return { ok: false as const, error: "Montant invalide." };

  await payments.createPayment(ctx.organizationId, {
    invoiceId,
    amountMinor: data.amountMinor,
    method: data.method,
    reference: data.reference,
    note: data.note,
    status: "CONFIRMED",
    declaredByClient: false,
    confirmedById: ctx.user.id,
    confirmedAt: new Date(),
  });
  const invoice = await recomputeInvoicePayment(ctx.organizationId, invoiceId);
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      action: "payment.recorded",
      targetType: "Invoice",
      targetId: invoiceId,
      metadata: { amountMinor: data.amountMinor, method: data.method },
    },
  });
  if (invoice?.status === "PAID") {
    await ensureProjectForInvoice(ctx.organizationId, invoiceId, ctx.user.id);
  }
  return { ok: true as const };
}

/**
 * Déclaration d'un paiement par le CLIENT via le jeton public de la facture.
 * Crée un paiement EN ATTENTE de validation (aucune confirmation automatique).
 */
export async function declarePaymentByToken(
  token: string,
  data: { amountMinor: number; method: PaymentMethod; reference?: string },
) {
  const invoice = await getInvoiceByToken(token);
  if (!invoice) return { ok: false as const, error: "Facture introuvable." };
  if (invoice.status === "CANCELED" || invoice.status === "DRAFT") {
    return { ok: false as const, error: "Cette facture n'accepte pas de paiement." };
  }
  if (data.amountMinor <= 0) return { ok: false as const, error: "Montant invalide." };

  await payments.createPayment(invoice.organizationId, {
    invoiceId: invoice.id,
    amountMinor: data.amountMinor,
    method: data.method,
    reference: data.reference,
    status: "PENDING",
    declaredByClient: true,
  });
  await prisma.auditLog.create({
    data: {
      organizationId: invoice.organizationId,
      action: "payment.declared_by_client",
      targetType: "Invoice",
      targetId: invoice.id,
      metadata: { amountMinor: data.amountMinor, method: data.method, via: "public_portal" },
    },
  });
  return { ok: true as const };
}
