import { randomBytes } from "node:crypto";
import type { Prisma, InvoiceStatus, AmountKind } from "@prisma/client";
import { prisma } from "../database/client";
import { computeQuoteTotals } from "@/lib/quotes/totals";

/**
 * Couche d'accès aux factures — enforcement multi-tenant (organizationId
 * systématique). Réutilise le calcul de totaux des devis.
 */

export interface InvoiceItemInput {
  serviceId?: string | null;
  description: string;
  unitPriceMinor: number;
  quantity: number;
  taxRate: number;
}

export interface InvoiceCreateInput {
  contactId: string;
  quoteId?: string | null;
  currency: string;
  createdById?: string;
  dueDate?: Date | null;
  notes?: string;
  discountType?: AmountKind | null;
  discountValue?: number;
  depositType?: AmountKind | null;
  depositValue?: number;
  items: InvoiceItemInput[];
}

export interface InvoiceListParams {
  status?: InvoiceStatus;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function createInvoice(
  organizationId: string,
  input: InvoiceCreateInput,
) {
  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.findUnique({
      where: { id: organizationId },
      select: { invoicePrefix: true },
    });
    const prefix = org?.invoicePrefix ?? "FAC";
    const count = await tx.invoice.count({ where: { organizationId } });
    const year = new Date().getFullYear();
    const number = `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;

    const totals = computeQuoteTotals({
      lines: input.items,
      discountType: input.discountType,
      discountValue: input.discountValue,
      depositType: input.depositType,
      depositValue: input.depositValue,
    });

    return tx.invoice.create({
      data: {
        organizationId,
        contactId: input.contactId,
        quoteId: input.quoteId ?? null,
        number,
        currency: input.currency,
        publicToken: randomBytes(24).toString("hex"),
        createdById: input.createdById,
        dueDate: input.dueDate ?? null,
        notes: input.notes,
        discountType: input.discountType ?? null,
        discountValue: input.discountValue ?? 0,
        depositType: input.depositType ?? null,
        depositValue: input.depositValue ?? 0,
        subtotalMinor: totals.subtotalMinor,
        discountMinor: totals.discountMinor,
        taxMinor: totals.taxMinor,
        totalMinor: totals.totalMinor,
        depositMinor: totals.depositMinor,
        items: {
          create: input.items.map((it, i) => ({
            organizationId,
            serviceId: it.serviceId ?? null,
            description: it.description,
            unitPriceMinor: it.unitPriceMinor,
            quantity: it.quantity,
            taxRate: it.taxRate,
            position: i,
          })),
        },
      },
      include: { items: { orderBy: { position: "asc" } } },
    });
  });
}

export async function listInvoices(
  organizationId: string,
  params: InvoiceListParams = {},
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));

  const where: Prisma.InvoiceWhereInput = { organizationId, deletedAt: null };
  if (params.status) where.status = params.status;

  const [items, total] = await Promise.all([
    prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { contact: { select: { firstName: true, lastName: true, companyName: true } } },
    }),
    prisma.invoice.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export function getInvoiceById(organizationId: string, id: string) {
  return prisma.invoice.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: {
      items: { orderBy: { position: "asc" } },
      contact: { select: { id: true, firstName: true, lastName: true, companyName: true, email: true } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });
}

export function getInvoiceByToken(token: string) {
  return prisma.invoice.findFirst({
    where: { publicToken: token, deletedAt: null },
    include: {
      items: { orderBy: { position: "asc" } },
      contact: { select: { firstName: true, lastName: true, companyName: true, email: true } },
      organization: { select: { name: true, locale: true, legalName: true, email: true, phone: true, addressLine1: true, city: true, country: true, taxId: true } },
      payments: { where: { status: "CONFIRMED" }, orderBy: { createdAt: "desc" } },
    },
  });
}

export async function updateInvoiceStatus(
  organizationId: string,
  id: string,
  status: InvoiceStatus,
) {
  const result = await prisma.invoice.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: { status },
  });
  if (result.count === 0) return null;
  return getInvoiceById(organizationId, id);
}

export async function softDeleteInvoice(organizationId: string, id: string) {
  const result = await prisma.invoice.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count > 0;
}

/**
 * Recalcule le montant payé (somme des paiements CONFIRMÉS) et met à jour le
 * statut de la facture (PAID / PARTIALLY_PAID). Ne rétrograde pas une facture
 * annulée ou brouillon.
 */
export async function recomputeInvoicePayment(organizationId: string, invoiceId: string) {
  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, organizationId },
      select: { totalMinor: true, status: true },
    });
    if (!invoice) return null;

    const agg = await tx.payment.aggregate({
      where: { organizationId, invoiceId, status: "CONFIRMED" },
      _sum: { amountMinor: true },
    });
    const paidMinor = agg._sum.amountMinor ?? 0;

    let status = invoice.status;
    if (invoice.status !== "CANCELED" && invoice.status !== "DRAFT") {
      if (paidMinor >= invoice.totalMinor && invoice.totalMinor > 0) status = "PAID";
      else if (paidMinor > 0) status = "PARTIALLY_PAID";
      else status = "SENT";
    }

    return tx.invoice.update({
      where: { id: invoiceId },
      data: { paidMinor, status },
    });
  });
}
