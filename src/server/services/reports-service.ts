import "server-only";
import type { AuthContext } from "../auth/context";
import { assertCan } from "../permissions/permissions";
import { prisma } from "../database/client";

export type ReportPeriod = "mois" | "trimestre" | "annee";

export interface ReportData {
  period: ReportPeriod;
  from: Date;
  to: Date;
  collectedMinor: number; // CA encaissé (paiements confirmés sur la période)
  billedMinor: number; // total facturé (factures émises sur la période)
  outstandingMinor: number; // reste à encaisser (factures non payées, tous exercices)
  quotesTotal: number;
  quotesAccepted: number;
  conversionRate: number; // % devis passés en accepté parmi ceux envoyés/traités
  newProspects: number;
  newClients: number;
  currency: string;
}

/** Bornes [from, to) de la période, en UTC, à partir de « maintenant ». */
function periodBounds(period: ReportPeriod, nowMs: number): { from: Date; to: Date } {
  const now = new Date(nowMs);
  const y = now.getUTCFullYear();
  const m = now.getUTCMonth();
  if (period === "annee") {
    return { from: new Date(Date.UTC(y, 0, 1)), to: new Date(Date.UTC(y + 1, 0, 1)) };
  }
  if (period === "trimestre") {
    const q = Math.floor(m / 3) * 3;
    return { from: new Date(Date.UTC(y, q, 1)), to: new Date(Date.UTC(y, q + 3, 1)) };
  }
  return { from: new Date(Date.UTC(y, m, 1)), to: new Date(Date.UTC(y, m + 1, 1)) };
}

export async function getReport(ctx: AuthContext, period: ReportPeriod): Promise<ReportData> {
  assertCan(ctx.role, "reports.view");
  const organizationId = ctx.organizationId;
  const { from, to } = periodBounds(period, Date.now());

  const [
    collected,
    billed,
    outstandingInvoices,
    quotesTotal,
    quotesAccepted,
    quotesResponded,
    newProspects,
    newClients,
  ] = await Promise.all([
    prisma.payment.aggregate({
      where: { organizationId, status: "CONFIRMED", createdAt: { gte: from, lt: to } },
      _sum: { amountMinor: true },
    }),
    prisma.invoice.aggregate({
      where: { organizationId, deletedAt: null, createdAt: { gte: from, lt: to } },
      _sum: { totalMinor: true },
    }),
    prisma.invoice.findMany({
      where: { organizationId, deletedAt: null, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
      select: { totalMinor: true, paidMinor: true },
    }),
    prisma.quote.count({ where: { organizationId, deletedAt: null, createdAt: { gte: from, lt: to } } }),
    prisma.quote.count({ where: { organizationId, deletedAt: null, status: "ACCEPTED", createdAt: { gte: from, lt: to } } }),
    prisma.quote.count({
      where: { organizationId, deletedAt: null, status: { in: ["SENT", "VIEWED", "ACCEPTED", "REJECTED", "EXPIRED"] }, createdAt: { gte: from, lt: to } },
    }),
    prisma.contact.count({ where: { organizationId, deletedAt: null, type: "PROSPECT", createdAt: { gte: from, lt: to } } }),
    prisma.contact.count({ where: { organizationId, deletedAt: null, type: "CLIENT", createdAt: { gte: from, lt: to } } }),
  ]);

  const outstandingMinor = outstandingInvoices.reduce((sum, i) => sum + (i.totalMinor - i.paidMinor), 0);
  const conversionRate = quotesResponded === 0 ? 0 : Math.round((quotesAccepted / quotesResponded) * 100);

  return {
    period,
    from,
    to,
    collectedMinor: collected._sum.amountMinor ?? 0,
    billedMinor: billed._sum.totalMinor ?? 0,
    outstandingMinor,
    quotesTotal,
    quotesAccepted,
    conversionRate,
    newProspects,
    newClients,
    currency: ctx.organization.currency,
  };
}
