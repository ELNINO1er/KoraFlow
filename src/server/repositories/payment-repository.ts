import { Prisma, type PaymentMethod, type PaymentStatus } from "@prisma/client";
import { prisma } from "../database/client";

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

async function serializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const maxAttempts = 3;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: "Serializable" });
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!retryable || attempt === maxAttempts) throw error;
    }
  }
  throw new Error("Transaction de paiement impossible.");
}

/**
 * Crée un paiement uniquement pour une facture de la même organisation.
 * Les paiements confirmés ET en attente sont réservés dans le solde afin que
 * plusieurs déclarations simultanées ne puissent pas dépasser le total dû.
 */
export function createPayment(organizationId: string, data: PaymentCreateData) {
  return serializableTransaction(async (tx) => {
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

      return tx.payment.create({
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
  });
}

export function getPaymentById(organizationId: string, id: string) {
  return prisma.payment.findFirst({
    where: { id, organizationId },
  });
}

/** Confirme un paiement EN ATTENTE (scopé). Renvoie true si appliqué. */
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
      if (!payment) return false;

      const invoice = await tx.invoice.findFirst({
        where: { id: payment.invoiceId, organizationId, deletedAt: null },
        select: { totalMinor: true, status: true },
      });
      if (!invoice || ["DRAFT", "CANCELED", "PAID"].includes(invoice.status)) return false;

      const confirmed = await tx.payment.aggregate({
        where: { organizationId, invoiceId: payment.invoiceId, status: "CONFIRMED" },
        _sum: { amountMinor: true },
      });
      const paidMinor = confirmed._sum.amountMinor ?? 0;
      if (payment.amountMinor > invoice.totalMinor - paidMinor) return false;

      const result = await tx.payment.updateMany({
        where: { id, organizationId, status: "PENDING" },
        data: { status: "CONFIRMED", confirmedById, confirmedAt: new Date() },
      });
      return result.count > 0;
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
