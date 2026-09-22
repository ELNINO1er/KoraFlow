import "server-only";
import type { InvoiceStatus } from "@prisma/client";
import type { AuthContext } from "../auth/context";
import { assertCan } from "../permissions/permissions";
import { prisma } from "../database/client";
import * as invoices from "../repositories/invoice-repository";
import { getQuoteById } from "../repositories/quote-repository";

export class InvoiceError extends Error {}

export async function listInvoices(ctx: AuthContext, params: invoices.InvoiceListParams) {
  assertCan(ctx.role, "invoices.view");
  return invoices.listInvoices(ctx.organizationId, params);
}

export async function getInvoice(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "invoices.view");
  return invoices.getInvoiceById(ctx.organizationId, id);
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

  const invoice = await invoices.createInvoice(ctx.organizationId, {
    contactId: quote.contactId,
    quoteId: quote.id,
    currency: quote.currency,
    createdById: ctx.user.id,
    dueDate,
    notes: quote.notes ?? undefined,
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
  });

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

  return invoice;
}

export async function changeInvoiceStatus(ctx: AuthContext, id: string, status: InvoiceStatus) {
  assertCan(ctx.role, "invoices.update");
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
