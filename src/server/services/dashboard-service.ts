import "server-only";
import type { AuthContext } from "../auth/context";
import { prisma } from "../database/client";

export interface DashboardData {
  prospects: number;
  quotesAwaiting: number;
  receivedMinor: number;
  unpaidInvoices: number;
  /** Factures en retard (dérivé : échéance passée + solde dû). */
  overdueInvoices: number;
  /** Par mois (12 derniers) : encaissé, facturé (factures émises) et nombre de paiements. */
  revenueByMonth: { month: string; value: number; billed: number; count: number }[];
  /** Tendances mensuelles (7 derniers mois) pour les mini-graphiques des indicateurs. */
  trends: { prospects: number[]; quotes: number[]; revenue: number[]; invoices: number[] };
  recentActivity: { id: string; action: string; createdAt: Date }[];
  mobileMoney: { method: string; amountMinor: number; count: number }[];
  /** Instant de génération (ms) — évite d'appeler Date.now() dans le rendu. */
  nowMs: number;
}

const MONTHS_FR = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

/**
 * Agrège les indicateurs réels du tableau de bord, tous scopés à
 * l'organisation courante.
 */
export async function getDashboardData(ctx: AuthContext): Promise<DashboardData> {
  const organizationId = ctx.organizationId;
  const now = new Date();
  const yearAgo = new Date(now.getFullYear(), now.getMonth() - 11, 1);

  const [
    prospects,
    quotesAwaiting,
    receivedAgg,
    unpaidInvoices,
    overdueInvoices,
    confirmedPayments,
    recentActivity,
    mobileMoneyRows,
    issuedInvoices,
    newContacts,
    newQuotes,
  ] = await Promise.all([
    prisma.contact.count({ where: { organizationId, type: "PROSPECT", deletedAt: null } }),
    prisma.quote.count({ where: { organizationId, status: { in: ["SENT", "VIEWED"] }, deletedAt: null } }),
    prisma.payment.aggregate({ where: { organizationId, status: "CONFIRMED" }, _sum: { amountMinor: true } }),
    prisma.invoice.count({ where: { organizationId, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] }, deletedAt: null } }),
    // Retard dérivé : SENT/PARTIALLY_PAID (solde dû) dont l'échéance est passée.
    prisma.invoice.count({ where: { organizationId, status: { in: ["SENT", "PARTIALLY_PAID"] }, dueDate: { lt: new Date() }, deletedAt: null } }),
    prisma.payment.findMany({
      where: { organizationId, status: "CONFIRMED" },
      select: { amountMinor: true, createdAt: true },
    }),
    prisma.auditLog.findMany({
      where: { organizationId },
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, action: true, createdAt: true },
    }),
    prisma.payment.groupBy({
      by: ["method"],
      where: { organizationId, status: "CONFIRMED" },
      _sum: { amountMinor: true },
      _count: { _all: true },
    }),
    prisma.invoice.findMany({
      where: { organizationId, status: { notIn: ["DRAFT", "CANCELED"] }, issueDate: { gte: yearAgo }, deletedAt: null },
      select: { totalMinor: true, issueDate: true },
    }),
    prisma.contact.findMany({
      where: { organizationId, createdAt: { gte: yearAgo }, deletedAt: null },
      select: { createdAt: true },
    }),
    prisma.quote.findMany({
      where: { organizationId, status: { not: "DRAFT" }, issueDate: { gte: yearAgo }, deletedAt: null },
      select: { issueDate: true },
    }),
  ]);

  // Encaissé / facturé / paiements par mois, sur les 12 derniers mois.
  const buckets: { key: string; month: string; value: number; billed: number; count: number; contacts: number; quotes: number; invoices: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: MONTHS_FR[d.getMonth()] ?? "",
      value: 0,
      billed: 0,
      count: 0,
      contacts: 0,
      quotes: 0,
      invoices: 0,
    });
  }
  const bucketByKey = new Map(buckets.map((b) => [b.key, b]));
  const bucketOf = (d: Date) => bucketByKey.get(`${d.getFullYear()}-${d.getMonth()}`);
  for (const p of confirmedPayments) {
    const b = bucketOf(p.createdAt);
    if (b) {
      b.value += p.amountMinor;
      b.count += 1;
    }
  }
  for (const inv of issuedInvoices) {
    const b = bucketOf(inv.issueDate);
    if (b) {
      b.billed += inv.totalMinor;
      b.invoices += 1;
    }
  }
  for (const c of newContacts) {
    const b = bucketOf(c.createdAt);
    if (b) b.contacts += 1;
  }
  for (const q of newQuotes) {
    const b = bucketOf(q.issueDate);
    if (b) b.quotes += 1;
  }
  const last7 = buckets.slice(-7);

  const wantedMethods = ["WAVE", "ORANGE_MONEY", "MTN"] as const;
  const mmByMethod = new Map(
    mobileMoneyRows.map((r) => [r.method, { amountMinor: r._sum.amountMinor ?? 0, count: r._count._all }]),
  );
  const mobileMoney = wantedMethods.map((m) => ({
    method: m,
    amountMinor: mmByMethod.get(m)?.amountMinor ?? 0,
    count: mmByMethod.get(m)?.count ?? 0,
  }));

  return {
    prospects,
    quotesAwaiting,
    receivedMinor: receivedAgg._sum.amountMinor ?? 0,
    unpaidInvoices,
    overdueInvoices,
    revenueByMonth: buckets.map((b) => ({ month: b.month, value: b.value, billed: b.billed, count: b.count })),
    trends: {
      prospects: last7.map((b) => b.contacts),
      quotes: last7.map((b) => b.quotes),
      revenue: last7.map((b) => b.value),
      invoices: last7.map((b) => b.invoices),
    },
    recentActivity,
    mobileMoney,
    nowMs: now.getTime(),
  };
}
