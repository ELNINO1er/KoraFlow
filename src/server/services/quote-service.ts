import "server-only";
import type { AmountKind, QuoteStatus } from "@prisma/client";
import type { AuthContext } from "../auth/context";
import { assertCan } from "../permissions/permissions";
import { prisma } from "../database/client";
import * as quotes from "../repositories/quote-repository";
import { getContactById } from "../repositories/contact-repository";

export interface CreateQuoteServiceInput {
  contactId: string;
  expiryDate?: Date | null;
  notes?: string;
  terms?: string;
  discountType?: AmountKind | null;
  discountValue?: number;
  depositType?: AmountKind | null;
  depositValue?: number;
  items: quotes.QuoteItemInput[];
}

export class InvalidQuoteError extends Error {}

export async function listQuotes(
  ctx: AuthContext,
  params: quotes.QuoteListParams,
) {
  assertCan(ctx.role, "quotes.view");
  return quotes.listQuotes(ctx.organizationId, params);
}

export async function getQuote(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "quotes.view");
  return quotes.getQuoteById(ctx.organizationId, id);
}

export async function createQuote(
  ctx: AuthContext,
  input: CreateQuoteServiceInput,
) {
  assertCan(ctx.role, "quotes.create");

  // Le client DOIT appartenir à l'organisation (anti-fuite inter-tenant).
  const contact = await getContactById(ctx.organizationId, input.contactId);
  if (!contact) {
    throw new InvalidQuoteError("Client introuvable dans votre organisation.");
  }
  if (input.items.length === 0) {
    throw new InvalidQuoteError("Le devis doit comporter au moins une ligne.");
  }

  // Défense : n'accepter un serviceId que s'il appartient à l'organisation ;
  // sinon on conserve la ligne mais on détache la référence (les valeurs
  // restent un snapshot).
  const referencedIds = input.items
    .map((i) => i.serviceId)
    .filter((v): v is string => Boolean(v));
  const ownServiceIds = new Set(
    referencedIds.length > 0
      ? (
          await prisma.service.findMany({
            where: { organizationId: ctx.organizationId, id: { in: referencedIds } },
            select: { id: true },
          })
        ).map((s) => s.id)
      : [],
  );
  const safeItems = input.items.map((i) => ({
    ...i,
    serviceId: i.serviceId && ownServiceIds.has(i.serviceId) ? i.serviceId : null,
  }));

  const quote = await quotes.createQuote(ctx.organizationId, {
    contactId: input.contactId,
    currency: ctx.organization.currency,
    createdById: ctx.user.id,
    expiryDate: input.expiryDate ?? null,
    notes: input.notes,
    terms: input.terms,
    discountType: input.discountType ?? null,
    discountValue: input.discountValue ?? 0,
    depositType: input.depositType ?? null,
    depositValue: input.depositValue ?? 0,
    items: safeItems,
  });

  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      action: "quote.created",
      targetType: "Quote",
      targetId: quote.id,
      metadata: { number: quote.number, totalMinor: quote.totalMinor },
    },
  });

  return quote;
}

export async function changeQuoteStatus(
  ctx: AuthContext,
  id: string,
  status: QuoteStatus,
) {
  assertCan(ctx.role, "quotes.update");
  const updated = await quotes.updateQuoteStatus(ctx.organizationId, id, status);
  if (updated) {
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        actorUserId: ctx.user.id,
        action: "quote.status_changed",
        targetType: "Quote",
        targetId: id,
        metadata: { status },
      },
    });
  }
  return updated;
}

export async function deleteQuote(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "quotes.delete");
  const ok = await quotes.softDeleteQuote(ctx.organizationId, id);
  if (ok) {
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        actorUserId: ctx.user.id,
        action: "quote.deleted",
        targetType: "Quote",
        targetId: id,
      },
    });
  }
  return ok;
}
