import { Prisma, type PaymentMethod, type PaymentStatus } from "@prisma/client";
import { prisma } from "../database/client";
import { serializableTransaction } from "../database/transaction";
import { syncInvoicePayment } from "./invoice-repository";

/**
 * Couche d'accès aux paiements — enforcement multi-tenant (organizationId
 * systématique). La déclaration publique (par jeton de facture) passe par le
 * service, qui résout l'organisation depuis la facture.
 */

export interface PaymentCreateData {
  invoiceId: string;
  amountMinor: number;
  method: PaymentMethod;
  reference?: string | null;
  declaredByClient?: boolean;
  status?: PaymentStatus;
  note?: string | null;
  confirmedById?: string | null;
  confirmedAt?: Date | null;
}

export type PaymentCreateErrorCode =
  | "INVOICE_NOT_FOUND"
  | "INVOICE_NOT_PAYABLE"
  | "AMOUNT_EXCEEDS_BALANCE"
  | "DUPLICATE_REFERENCE";

export class PaymentCreateError extends Error {
  constructor(public readonly code: PaymentCreateErrorCode) {
    super(code);
    this.name = "PaymentCreateError";
  }
}

/**
 * Crée un paiement uniquement pour une facture de la même organisation.
 * Les paiements confirmés ET en attente sont réservés dans le solde afin que
 * plusieurs déclarations simultanées ne puissent pas dépasser le total dû.
 */
export function createPayment(organizationId: string, data: PaymentCreateData) {
  return serializableTransaction(async (tx) => {
      // Verrou sur la facture : déclarations et saisies d'une même facture se suivent.
      await tx.$queryRaw`SELECT id FROM invoice WHERE id = ${data.invoiceId} AND organizationId = ${organizationId} FOR UPDATE`;
      const invoice = await tx.invoice.findFirst({
        where: { id: data.invoiceId, organizationId, deletedAt: null },
        select: { id: true, totalMinor: true, status: true },
      });
      if (!invoice) throw new PaymentCreateError("INVOICE_NOT_FOUND");
      if (["DRAFT", "CANCELED", "PAID"].includes(invoice.status)) {
        throw new PaymentCreateError("INVOICE_NOT_PAYABLE");
      }

      const reference = data.reference?.trim() || null;
      if (reference) {
        const duplicate = await tx.payment.findFirst({
          where: {
            organizationId,
            invoiceId: invoice.id,
            reference,
            status: { in: ["PENDING", "CONFIRMED"] },
          },
          select: { id: true },
        });
        if (duplicate) throw new PaymentCreateError("DUPLICATE_REFERENCE");
      }

      const committed = await tx.payment.aggregate({
        where: {
          organizationId,
          invoiceId: invoice.id,
          status: { in: ["PENDING", "CONFIRMED"] },
        },
        _sum: { amountMinor: true },
      });
      const remainingMinor = invoice.totalMinor - (committed._sum.amountMinor ?? 0);
      if (data.amountMinor <= 0 || data.amountMinor > remainingMinor) {
        throw new PaymentCreateError("AMOUNT_EXCEEDS_BALANCE");
      }

      const payment = await tx.payment.create({
        data: {
          organizationId,
          invoiceId: invoice.id,
          amountMinor: data.amountMinor,
          method: data.method,
          reference,
          declaredByClient: data.declaredByClient ?? false,
          status: data.status ?? "PENDING",
          note: data.note ?? null,
          confirmedById: data.confirmedById ?? null,
          confirmedAt: data.confirmedAt ?? null,
        },
      });
      // Encaissement saisi directement comme confirmé : le solde suit dans la même transaction.
      if (payment.status === "CONFIRMED") await syncInvoicePayment(tx, organizationId, invoice.id);
      return payment;
  });
}

export function getPaymentById(organizationId: string, id: string) {
  return prisma.payment.findFirst({
    where: { id, organizationId },
  });
}

/**
 * Confirme un paiement EN ATTENTE (scopé) ET met à jour le solde de la facture
 * dans la même transaction : une interruption ne peut plus laisser un paiement
 * confirmé que la facture ignore. Renvoie le nouveau statut, ou null.
 */
export async function confirmPayment(
  organizationId: string,
  id: string,
  confirmedById: string,
) {
  return serializableTransaction(async (tx) => {
      const payment = await tx.payment.findFirst({
        where: { id, organizationId, status: "PENDING" },
        select: { id: true, invoiceId: true, amountMinor: true },
      });
      if (!payment) return null;
      // Verrou sur la facture : les confirmations d'une même facture se suivent.
      await tx.$queryRaw`SELECT id FROM invoice WHERE id = ${payment.invoiceId} AND organizationId = ${organizationId} FOR UPDATE`;

      const invoice = await tx.invoice.findFirst({
        where: { id: payment.invoiceId, organizationId, deletedAt: null },
        select: { totalMinor: true, status: true },
      });
      if (!invoice || ["DRAFT", "CANCELED", "PAID"].includes(invoice.status)) return null;

      const confirmed = await tx.payment.aggregate({
        where: { organizationId, invoiceId: payment.invoiceId, status: "CONFIRMED" },
        _sum: { amountMinor: true },
      });
      const paidMinor = confirmed._sum.amountMinor ?? 0;
      if (payment.amountMinor > invoice.totalMinor - paidMinor) return null;

      const result = await tx.payment.updateMany({
        where: { id, organizationId, status: "PENDING" },
        data: { status: "CONFIRMED", confirmedById, confirmedAt: new Date() },
      });
      if (result.count === 0) return null;
      const updated = await syncInvoicePayment(tx, organizationId, payment.invoiceId);
      return { invoiceId: payment.invoiceId, invoiceStatus: updated?.status ?? null };
  });
}

/** Rejette un paiement EN ATTENTE (scopé). */
export async function rejectPayment(organizationId: string, id: string) {
  const result = await prisma.payment.updateMany({
    where: { id, organizationId, status: "PENDING" },
    data: { status: "REJECTED" },
  });
  return result.count > 0;
}
