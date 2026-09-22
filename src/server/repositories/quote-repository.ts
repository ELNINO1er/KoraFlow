import { randomBytes } from "node:crypto";
import type { Prisma, QuoteStatus, AmountKind } from "@prisma/client";
import { prisma } from "../database/client";
import { computeQuoteTotals } from "@/lib/quotes/totals";

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
    const count = await tx.quote.count({ where: { organizationId } });
    const year = new Date().getFullYear();
    const number = `${prefix}-${year}-${String(count + 1).padStart(4, "0")}`;

    const totals = computeQuoteTotals({
      lines: input.items,
      discountType: input.discountType,
      discountValue: input.discountValue,
      depositType: input.depositType,
      depositValue: input.depositValue,
    });

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
        select: { name: true, legalName: true, email: true, phone: true, addressLine1: true, city: true, country: true, taxId: true, locale: true },
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
 * en attente (SENT ou VIEWED). Renvoie true si le statut a changé.
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
    },
    data: { status: decision },
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
