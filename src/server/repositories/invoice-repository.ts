import { randomBytes } from "node:crypto";
import { Prisma } from "@prisma/client";
import type { InvoiceStatus, AmountKind } from "@prisma/client";
import { prisma } from "../database/client";
import { computeQuoteTotals, MoneyBoundsError, totalsWithinColumnBounds } from "@/lib/quotes/totals";
import { nextDocumentSequence } from "./document-sequence-repository";

/**
 * Transaction SÉRIALISABLE avec rejeu sur conflit (P2034). Garantit qu'un
 * contrôle « existe-t-il déjà une facture pour ce devis ? » suivi d'une
 * création ne peut pas être doublé par deux requêtes concurrentes.
 */
async function serializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: "Serializable" });
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!retryable || attempt === maxAttempts) throw error;
    }
  }
  throw new Error("Transaction de facture impossible.");
}

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
  title?: string | null;
  introduction?: string | null;
  terms?: string | null;
  sections?: Prisma.InputJsonValue;
  discountType?: AmountKind | null;
  discountValue?: number;
  depositType?: AmountKind | null;
  depositValue?: number;
  items: InvoiceItemInput[];
}

export interface InvoiceUpdateInput {
  dueDate?: Date | null;
  notes?: string | null;
  title?: string | null;
  introduction?: string | null;
  terms?: string | null;
  sections?: Prisma.InputJsonValue;
  headerColor?: string | null;
  footerColor?: string | null;
  footerText?: string | null;
  discountType?: AmountKind | null;
  discountValue?: number;
  depositType?: AmountKind | null;
  depositValue?: number;
  items: InvoiceItemInput[];
}

export interface InvoiceListParams {
  status?: InvoiceStatus;
  /** Filtre dérivé « en retard » : échéance passée + solde dû (SENT/PARTIALLY_PAID). */
  overdue?: boolean;
  search?: string;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/** Construit une facture (numéro séquentiel + totaux figés) dans la transaction fournie. */
async function buildInvoiceInTx(
  tx: Prisma.TransactionClient,
  organizationId: string,
  input: InvoiceCreateInput,
) {
  const org = await tx.organization.findUnique({
    where: { id: organizationId },
    select: { invoicePrefix: true },
  });
  const prefix = org?.invoicePrefix ?? "FAC";
  const year = new Date().getFullYear();
  const sequence = await nextDocumentSequence(tx, organizationId, "INVOICE", year);
  const number = `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;

  const totals = computeQuoteTotals({
    lines: input.items,
    discountType: input.discountType,
    discountValue: input.discountValue,
    depositType: input.depositType,
    depositValue: input.depositValue,
  });
  if (!totalsWithinColumnBounds(totals)) throw new MoneyBoundsError();

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
      title: input.title ?? null,
      introduction: input.introduction ?? null,
      terms: input.terms ?? null,
      sections: input.sections ?? undefined,
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
}

export async function createInvoice(
  organizationId: string,
  input: InvoiceCreateInput,
) {
  return prisma.$transaction((tx) => buildInvoiceInTx(tx, organizationId, input));
}

/**
 * Génère une facture depuis un devis de façon IDEMPOTENTE et sûre en
 * concurrence. Règle métier retenue : le parcours « générer la facture » depuis
 * un devis produit AU PLUS UNE facture par devis. Si une facture non annulée
 * existe déjà pour ce devis, elle est renvoyée telle quelle (`created: false`)
 * sans en créer une seconde — y compris si deux requêtes arrivent en même temps
 * (transaction sérialisable). Les factures multiples (acomptes, échéances) ne
 * sont pas interdites au niveau base : aucune contrainte d'unicité sur
 * `quoteId` n'est posée, afin de laisser la place à un futur parcours dédié.
 */
export async function generateInvoiceFromQuoteIdempotent(
  organizationId: string,
  quoteId: string,
  input: InvoiceCreateInput,
): Promise<{ invoice: Awaited<ReturnType<typeof buildInvoiceInTx>>; created: boolean }> {
  return serializableTransaction(async (tx) => {
    const existing = await tx.invoice.findFirst({
      where: { organizationId, quoteId, deletedAt: null, status: { not: "CANCELED" } },
      orderBy: { createdAt: "asc" },
      include: { items: { orderBy: { position: "asc" } } },
    });
    if (existing) return { invoice: existing, created: false };
    const invoice = await buildInvoiceInTx(tx, organizationId, { ...input, quoteId });
    return { invoice, created: true };
  });
}

export async function listInvoices(
  organizationId: string,
  params: InvoiceListParams = {},
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));

  const where: Prisma.InvoiceWhereInput = { organizationId, deletedAt: null };
  if (params.overdue) {
    // Retard dérivé : SENT/PARTIALLY_PAID (solde dû par construction) + échéance
    // passée. Prend le pas sur un éventuel filtre de statut.
    where.status = { in: ["SENT", "PARTIALLY_PAID"] };
    where.dueDate = { lt: new Date() };
  } else if (params.status) {
    where.status = params.status;
  }
  if (params.search && params.search.trim() !== "") {
    where.number = { contains: params.search.trim(), mode: "insensitive" };
  }

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
      organization: { select: { id: true, name: true, logoUrl: true, locale: true, legalName: true, email: true, phone: true, addressLine1: true, city: true, country: true, taxId: true } },
      payments: { where: { status: "CONFIRMED" }, orderBy: { createdAt: "desc" } },
    },
  });
}

export async function updateDraftInvoice(
  organizationId: string,
  id: string,
  input: InvoiceUpdateInput,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.invoice.findFirst({
      where: { id, organizationId, status: "DRAFT", deletedAt: null },
      select: { id: true },
    });
    if (!current) return null;

    const totals = computeQuoteTotals({
      lines: input.items,
      discountType: input.discountType,
      discountValue: input.discountValue,
      depositType: input.depositType,
      depositValue: input.depositValue,
    });
    if (!totalsWithinColumnBounds(totals)) throw new MoneyBoundsError();

    await tx.invoiceItem.deleteMany({ where: { invoiceId: id, organizationId } });
    return tx.invoice.update({
      where: { id },
      data: {
        dueDate: input.dueDate ?? null,
        notes: input.notes ?? null,
        title: input.title ?? null,
        introduction: input.introduction ?? null,
        terms: input.terms ?? null,
        sections: input.sections ?? undefined,
        headerColor: input.headerColor ?? null,
        footerColor: input.footerColor ?? null,
        footerText: input.footerText ?? null,
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
          create: input.items.map((item, position) => ({
            organizationId,
            serviceId: item.serviceId ?? null,
            description: item.description,
            unitPriceMinor: item.unitPriceMinor,
            quantity: item.quantity,
            taxRate: item.taxRate,
            position,
          })),
        },
      },
      include: { items: { orderBy: { position: "asc" } } },
    });
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
      select: { totalMinor: true, status: true, dueDate: true },
    });
    if (!invoice) return null;

    const agg = await tx.payment.aggregate({
      where: { organizationId, invoiceId, status: "CONFIRMED" },
      _sum: { amountMinor: true },
    });
    const paidMinor = agg._sum.amountMinor ?? 0;

    let status = invoice.status;
    if (invoice.status !== "CANCELED" && invoice.status !== "DRAFT") {
      // Le statut reflète UNIQUEMENT le paiement ; le retard est un indicateur
      // dérivé (isInvoiceOverdue) calculé à l'affichage depuis dueDate. On ne
      // stocke donc jamais OVERDUE : une facture partiellement payée reste
      // PARTIALLY_PAID même échue, sans perdre le signal de retard (dérivé).
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
