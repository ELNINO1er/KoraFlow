import type { PaymentMethod, PaymentStatus } from "@prisma/client";
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

export function createPayment(organizationId: string, data: PaymentCreateData) {
  return prisma.payment.create({
    data: {
      organizationId,
      invoiceId: data.invoiceId,
      amountMinor: data.amountMinor,
      method: data.method,
      reference: data.reference ?? null,
      declaredByClient: data.declaredByClient ?? false,
      status: data.status ?? "PENDING",
      note: data.note ?? null,
      confirmedById: data.confirmedById ?? null,
      confirmedAt: data.confirmedAt ?? null,
    },
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
  const result = await prisma.payment.updateMany({
    where: { id, organizationId, status: "PENDING" },
    data: { status: "CONFIRMED", confirmedById, confirmedAt: new Date() },
  });
  return result.count > 0;
}

/** Rejette un paiement EN ATTENTE (scopé). */
export async function rejectPayment(organizationId: string, id: string) {
  const result = await prisma.payment.updateMany({
    where: { id, organizationId, status: "PENDING" },
    data: { status: "REJECTED" },
  });
  return result.count > 0;
}
