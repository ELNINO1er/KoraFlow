import "server-only";
import type { InvoiceStatus } from "@prisma/client";
import type { AuthContext } from "../auth/context";
import { assertCan } from "../permissions/permissions";
import { prisma } from "../database/client";
import * as invoices from "../repositories/invoice-repository";
import { getQuoteById } from "../repositories/quote-repository";
import { isManualInvoiceTransition } from "@/lib/constants/invoices";

export class InvoiceError extends Error {}

export async function listInvoices(ctx: AuthContext, params: invoices.InvoiceListParams) {
  assertCan(ctx.role, "invoices.view");
  return invoices.listInvoices(ctx.organizationId, params);
}

export async function getInvoice(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "invoices.view");
  return invoices.getInvoiceById(ctx.organizationId, id);
}

export async function updateDraftInvoice(
  ctx: AuthContext,
  id: string,
  input: invoices.InvoiceUpdateInput,
) {
  assertCan(ctx.role, "invoices.update");
  const updated = await invoices.updateDraftInvoice(ctx.organizationId, id, input);
  if (!updated) {
    throw new InvoiceError("Seule une facture brouillon peut être modifiée.");
  }
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      action: "invoice.updated",
      targetType: "Invoice",
      targetId: id,
      metadata: { itemCount: input.items.length, totalMinor: updated.totalMinor },
    },
  });
  return updated;
}

export async function reopenInvoiceForCorrection(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "invoices.update");
  const current = await invoices.getInvoiceById(ctx.organizationId, id);
  if (!current) throw new InvoiceError("Facture introuvable.");
  if (!(["SENT", "OVERDUE"] as InvoiceStatus[]).includes(current.status)) {
    throw new InvoiceError("Cette facture ne peut pas être remise en brouillon.");
  }
  if (current.paidMinor > 0 || current.payments.some((payment) => payment.status === "CONFIRMED")) {
    throw new InvoiceError("Une facture comportant un paiement confirmé ne peut plus être corrigée.");
  }
  const updated = await invoices.updateInvoiceStatus(ctx.organizationId, id, "DRAFT");
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      action: "invoice.reopened_for_correction",
      targetType: "Invoice",
      targetId: id,
      metadata: { previousStatus: current.status },
    },
  });
  return updated;
}

/** Génère une facture à partir d'un devis ACCEPTÉ (échéance à 30 jours). */
export async function generateFromQuote(ctx: AuthContext, quoteId: string) {
  assertCan(ctx.role, "invoices.create");

  const quote = await getQuoteById(ctx.organizationId, quoteId);
  if (!quote) throw new InvoiceError("Devis introuvable.");
  if (quote.status !== "ACCEPTED") {
    throw new InvoiceError("Le devis doit être accepté avant de générer une facture.");
  }

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 30);

  // Idempotent + sûr en concurrence : renvoie la facture existante si le devis
  // a déjà été facturé, au lieu de créer un doublon à chaque clic/requête.
  const { invoice, created } = await invoices.generateInvoiceFromQuoteIdempotent(
    ctx.organizationId,
    quote.id,
    {
      contactId: quote.contactId,
      quoteId: quote.id,
      currency: quote.currency,
      createdById: ctx.user.id,
      dueDate,
      notes: quote.notes ?? undefined,
      // Conditions et rédaction FIGÉES depuis le devis au moment de la conversion
      // (ne dépendent plus d'une modification ultérieure du devis source).
      title: quote.title,
      introduction: quote.introduction,
      terms: quote.terms,
      sections: (quote.sections as never) ?? undefined,
      discountType: quote.discountType,
      discountValue: quote.discountValue,
      depositType: quote.depositType,
      depositValue: quote.depositValue,
      items: quote.items.map((it) => ({
        serviceId: it.serviceId,
        description: it.description,
        unitPriceMinor: it.unitPriceMinor,
        quantity: it.quantity,
        taxRate: it.taxRate,
      })),
    },
  );

  // N'écrire l'audit que lors d'une création réelle (pas sur un renvoi idempotent).
  if (created) {
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        actorUserId: ctx.user.id,
        action: "invoice.created",
        targetType: "Invoice",
        targetId: invoice.id,
        metadata: { number: invoice.number, quoteId: quote.id },
      },
    });
  }

  return invoice;
}

export async function changeInvoiceStatus(ctx: AuthContext, id: string, status: InvoiceStatus) {
  assertCan(ctx.role, "invoices.update");
  if (status === "PAID" || status === "PARTIALLY_PAID") {
    throw new InvoiceError("Le statut de paiement est calculé depuis les encaissements confirmés.");
  }
  const current = await invoices.getInvoiceById(ctx.organizationId, id);
  if (!current) return null;
  if (current.status === status) return current;
  if (!isManualInvoiceTransition(current.status, status)) {
    throw new InvoiceError("Cette transition de statut n'est pas autorisée.");
  }
  const updated = await invoices.updateInvoiceStatus(ctx.organizationId, id, status);
  if (updated) {
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        actorUserId: ctx.user.id,
        action: "invoice.status_changed",
        targetType: "Invoice",
        targetId: id,
        metadata: { status },
      },
    });
  }
  return updated;
}

export async function deleteInvoice(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "invoices.delete");
  return invoices.softDeleteInvoice(ctx.organizationId, id);
}
