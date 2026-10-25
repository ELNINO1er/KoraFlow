import { randomBytes } from "node:crypto";
import { Prisma, type QuoteStatus, type AmountKind } from "@prisma/client";
import { prisma } from "../database/client";
import { computeQuoteTotals, MoneyBoundsError, totalsWithinColumnBounds } from "@/lib/quotes/totals";
import { nextDocumentSequence } from "./document-sequence-repository";

/**
 * Couche d'accès aux devis — POINT D'ENFORCEMENT MULTI-TENANT.
 * `organizationId` systématique dans les where ; mutations via updateMany scopé.
 */

export interface QuoteItemInput {
  serviceId?: string | null;
  description: string;
  unitPriceMinor: number;
  quantity: number;
  taxRate: number;
}

export interface QuoteCreateInput {
  contactId: string;
  currency: string;
  createdById?: string;
  expiryDate?: Date | null;
  notes?: string;
  terms?: string;
  title?: string | null;
  introduction?: string | null;
  sections?: Prisma.InputJsonValue;
  design?: Prisma.InputJsonValue | null;
  discountType?: AmountKind | null;
  discountValue?: number;
  depositType?: AmountKind | null;
  depositValue?: number;
  items: QuoteItemInput[];
}

export interface QuoteUpdateInput {
  expiryDate?: Date | null;
  notes?: string | null;
  terms?: string | null;
  title?: string | null;
  introduction?: string | null;
  sections?: Prisma.InputJsonValue;
  design?: Prisma.InputJsonValue | null;
  discountType?: AmountKind | null;
  discountValue?: number;
  depositType?: AmountKind | null;
  depositValue?: number;
  items: QuoteItemInput[];
}

export interface QuoteListParams {
  status?: QuoteStatus;
  contactId?: string;
  search?: string;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

/**
 * Crée un devis avec ses lignes de façon atomique : génère le numéro séquentiel
 * (préfixe de l'organisation + année + rang) et fige les totaux calculés.
 */
export async function createQuote(
  organizationId: string,
  input: QuoteCreateInput,
) {
  return prisma.$transaction(async (tx) => {
    const org = await tx.organization.findUnique({
      where: { id: organizationId },
      select: { quotePrefix: true },
    });
    const prefix = org?.quotePrefix ?? "DEV";
    const year = new Date().getFullYear();
    const sequence = await nextDocumentSequence(tx, organizationId, "QUOTE", year);
    const number = `${prefix}-${year}-${String(sequence).padStart(4, "0")}`;

    const totals = computeQuoteTotals({
      lines: input.items,
      discountType: input.discountType,
      discountValue: input.discountValue,
      depositType: input.depositType,
      depositValue: input.depositValue,
    });
    if (!totalsWithinColumnBounds(totals)) throw new MoneyBoundsError();

    return tx.quote.create({
      data: {
        organizationId,
        contactId: input.contactId,
        number,
        currency: input.currency,
        publicToken: randomBytes(24).toString("hex"),
        createdById: input.createdById,
        expiryDate: input.expiryDate ?? null,
        notes: input.notes,
        terms: input.terms,
        title: input.title ?? null,
        introduction: input.introduction ?? null,
        sections: input.sections ?? undefined,
        design: input.design ?? undefined,
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

export async function listQuotes(
  organizationId: string,
  params: QuoteListParams = {},
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE),
  );

  const where: Prisma.QuoteWhereInput = {
    organizationId,
    deletedAt: null,
  };
  if (params.status) where.status = params.status;
  if (params.contactId) where.contactId = params.contactId;
  if (params.search && params.search.trim() !== "") {
    where.number = { contains: params.search.trim(), mode: "insensitive" };
  }

  const [items, total] = await Promise.all([
    prisma.quote.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { contact: { select: { firstName: true, lastName: true, companyName: true } } },
    }),
    prisma.quote.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export function getQuoteById(organizationId: string, id: string) {
  return prisma.quote.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: {
      items: { orderBy: { position: "asc" } },
      contact: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          companyName: true,
          email: true,
        },
      },
    },
  });
}

/** Met à jour un devis BROUILLON uniquement (recalcul des totaux + bornes). */
export async function updateDraftQuote(
  organizationId: string,
  id: string,
  input: QuoteUpdateInput,
) {
  return prisma.$transaction(async (tx) => {
    const current = await tx.quote.findFirst({
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

    await tx.quoteItem.deleteMany({ where: { quoteId: id, organizationId } });
    return tx.quote.update({
      where: { id },
      data: {
        expiryDate: input.expiryDate ?? null,
        notes: input.notes ?? null,
        terms: input.terms ?? null,
        title: input.title ?? null,
        introduction: input.introduction ?? null,
        sections: input.sections ?? Prisma.JsonNull,
        design: input.design ?? Prisma.JsonNull,
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

export async function updateQuoteStatus(
  organizationId: string,
  id: string,
  status: QuoteStatus,
) {
  const result = await prisma.quote.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: { status },
  });
  if (result.count === 0) return null;
  return getQuoteById(organizationId, id);
}

// --- Accès public par jeton (portail client, hors authentification) ---------
// Le jeton est le secret : ces fonctions ne sont PAS scopées par organisation.

export function getQuoteByPublicToken(token: string) {
  return prisma.quote.findFirst({
    where: { publicToken: token, deletedAt: null },
    include: {
      items: { orderBy: { position: "asc" } },
      contact: { select: { firstName: true, lastName: true, companyName: true, email: true } },
      organization: {
        select: { id: true, name: true, logoUrl: true, legalName: true, email: true, phone: true, addressLine1: true, city: true, country: true, taxId: true, locale: true },
      },
    },
  });
}

/** Marque le devis comme « consulté » lors du premier affichage (SENT -> VIEWED). */
export async function markQuoteViewedByToken(token: string) {
  await prisma.quote.updateMany({
    where: { publicToken: token, status: "SENT", deletedAt: null },
    data: { status: "VIEWED" },
  });
}

/**
 * Réponse du client : acceptation ou refus. N'agit que si le devis est encore
 * en attente (SENT ou VIEWED). L'ACCEPTATION est en outre refusée si la date de
 * validité est dépassée (vérification côté serveur, au moment de l'acte, qui ne
 * dépend pas d'un éventuel passage automatique à EXPIRED). Renvoie true si le
 * statut a changé.
 */
export async function respondToQuoteByToken(
  token: string,
  decision: "ACCEPTED" | "REJECTED",
) {
  const result = await prisma.quote.updateMany({
    where: {
      publicToken: token,
      status: { in: ["SENT", "VIEWED"] },
      deletedAt: null,
      // Un devis expiré ne peut plus être accepté (le refus reste possible).
      ...(decision === "ACCEPTED"
        ? { OR: [{ expiryDate: null }, { expiryDate: { gte: new Date() } }] }
        : {}),
    },
    data: { status: decision },
  });
  return result.count > 0;
}

/**
 * Bascule en EXPIRED un devis en attente dont la date de validité est passée.
 * Renvoie true si une expiration a été appliquée.
 */
export async function expireQuoteByTokenIfNeeded(token: string) {
  const result = await prisma.quote.updateMany({
    where: {
      publicToken: token,
      status: { in: ["SENT", "VIEWED"] },
      deletedAt: null,
      expiryDate: { lt: new Date() },
    },
    data: { status: "EXPIRED" },
  });
  return result.count > 0;
}

export async function softDeleteQuote(organizationId: string, id: string) {
  const result = await prisma.quote.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count > 0;
}
