import "server-only";
import type { AuthContext } from "../auth/context";
import { prisma } from "../database/client";

export interface DashboardData {
  prospects: number;
  quotesAwaiting: number;
  receivedMinor: number;
  unpaidInvoices: number;
  revenueByMonth: { month: string; value: number }[];
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

  const [
    prospects,
    quotesAwaiting,
    receivedAgg,
    unpaidInvoices,
    confirmedPayments,
    recentActivity,
    mobileMoneyRows,
  ] = await Promise.all([
    prisma.contact.count({ where: { organizationId, type: "PROSPECT", deletedAt: null } }),
    prisma.quote.count({ where: { organizationId, status: { in: ["SENT", "VIEWED"] }, deletedAt: null } }),
    prisma.payment.aggregate({ where: { organizationId, status: "CONFIRMED" }, _sum: { amountMinor: true } }),
    prisma.invoice.count({ where: { organizationId, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] }, deletedAt: null } }),
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
  ]);

  // Chiffre d'affaires encaissé par mois, sur les 12 derniers mois.
  const now = new Date();
  const buckets: { key: string; month: string; value: number }[] = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    buckets.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: MONTHS_FR[d.getMonth()] ?? "",
      value: 0,
    });
  }
  const bucketByKey = new Map(buckets.map((b) => [b.key, b]));
  for (const p of confirmedPayments) {
    const key = `${p.createdAt.getFullYear()}-${p.createdAt.getMonth()}`;
    const b = bucketByKey.get(key);
    if (b) b.value += p.amountMinor;
  }

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
    revenueByMonth: buckets.map((b) => ({ month: b.month, value: b.value })),
    recentActivity,
    mobileMoney,
    nowMs: now.getTime(),
  };
}
