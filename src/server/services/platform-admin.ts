import "server-only";
import type { Prisma } from "@prisma/client";
import type { PlatformAdmin } from "../auth/platform";
import { prisma } from "../database/client";

/**
 * Service d'administration de PLATEFORME.
 *
 * ⚠️ Contrairement au reste de l'application, ces requêtes ne sont PAS scopées
 * par `organizationId` : elles traversent délibérément l'isolation multi-tenant.
 * C'est pourquoi elles vivent dans un module dédié, appelées UNIQUEMENT après
 * `requirePlatformAdmin()` (voir src/server/auth/platform.ts). Toute mutation est
 * journalisée dans l'audit avec l'acteur (admin plateforme).
 */
export class PlatformAdminError extends Error {}

async function audit(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Prisma.InputJsonValue,
  organizationId?: string | null,
) {
  await prisma.auditLog.create({
    data: {
      organizationId: organizationId ?? null,
      actorUserId: adminId,
      action,
      targetType,
      targetId,
      metadata: metadata ?? undefined,
    },
  });
}

// ---------------------------------------------------------------------------
// Lectures (agrégats transverses)
// ---------------------------------------------------------------------------

export async function getPlatformOverview() {
  const [
    orgCount,
    orgSuspended,
    userCount,
    userSuspended,
    adminCount,
    contactCount,
    invoiceCount,
    confirmedByOrg,
    orgCurrencies,
    recentOrgs,
    recentUsers,
  ] = await Promise.all([
    prisma.organization.count(),
    prisma.organization.count({ where: { suspendedAt: { not: null } } }),
    prisma.user.count(),
    prisma.user.count({ where: { suspendedAt: { not: null } } }),
    prisma.user.count({ where: { isPlatformAdmin: true } }),
    prisma.contact.count(),
    prisma.invoice.count(),
    prisma.payment.groupBy({
      by: ["organizationId"],
      where: { status: "CONFIRMED" },
      _sum: { amountMinor: true },
    }),
    prisma.organization.findMany({ select: { id: true, currency: true } }),
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, slug: true, createdAt: true, suspendedAt: true },
    }),
    prisma.user.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      select: { id: true, name: true, email: true, createdAt: true, emailVerified: true },
    }),
  ]);

  // Revenu encaissé (paiements confirmés) agrégé PAR DEVISE — on n'additionne
  // jamais des devises différentes.
  const currencyOf = new Map(orgCurrencies.map((o) => [o.id, o.currency]));
  const revenueByCurrency: Record<string, number> = {};
  for (const row of confirmedByOrg) {
    const currency = currencyOf.get(row.organizationId) ?? "XOF";
    revenueByCurrency[currency] =
      (revenueByCurrency[currency] ?? 0) + (row._sum.amountMinor ?? 0);
  }

  return {
    orgCount,
    orgSuspended,
    userCount,
    userSuspended,
    adminCount,
    contactCount,
    invoiceCount,
    revenueByCurrency,
    recentOrgs,
    recentUsers,
  };
}

export async function listOrganizations() {
  const [orgs, members, contacts, invoices, revenue] = await Promise.all([
    prisma.organization.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        name: true,
        slug: true,
        currency: true,
        createdAt: true,
        suspendedAt: true,
      },
    }),
    prisma.membership.groupBy({ by: ["organizationId"], _count: { _all: true } }),
    prisma.contact.groupBy({ by: ["organizationId"], _count: { _all: true } }),
    prisma.invoice.groupBy({ by: ["organizationId"], _count: { _all: true } }),
    prisma.payment.groupBy({
      by: ["organizationId"],
      where: { status: "CONFIRMED" },
      _sum: { amountMinor: true },
    }),
  ]);

  const memberMap = new Map(members.map((r) => [r.organizationId, r._count._all]));
  const contactMap = new Map(contacts.map((r) => [r.organizationId, r._count._all]));
  const invoiceMap = new Map(invoices.map((r) => [r.organizationId, r._count._all]));
  const revenueMap = new Map(revenue.map((r) => [r.organizationId, r._sum.amountMinor ?? 0]));

  return orgs.map((o) => ({
    ...o,
    memberCount: memberMap.get(o.id) ?? 0,
    contactCount: contactMap.get(o.id) ?? 0,
    invoiceCount: invoiceMap.get(o.id) ?? 0,
    revenueMinor: revenueMap.get(o.id) ?? 0,
  }));
}

export async function getOrganizationDetail(orgId: string) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    include: {
      memberships: {
        orderBy: { createdAt: "asc" },
        include: {
          user: { select: { id: true, name: true, email: true, suspendedAt: true } },
        },
      },
    },
  });
  if (!org) return null;

  const [contactCount, quoteCount, invoiceCount, projectCount, revenue, recentAudit] =
    await Promise.all([
      prisma.contact.count({ where: { organizationId: orgId } }),
      prisma.quote.count({ where: { organizationId: orgId } }),
      prisma.invoice.count({ where: { organizationId: orgId } }),
      prisma.project.count({ where: { organizationId: orgId } }),
      prisma.payment.aggregate({
        where: { organizationId: orgId, status: "CONFIRMED" },
        _sum: { amountMinor: true },
      }),
      prisma.auditLog.findMany({
        where: { organizationId: orgId },
        orderBy: { createdAt: "desc" },
        take: 15,
        include: { actor: { select: { email: true } } },
      }),
    ]);

  return {
    org,
    stats: {
      contactCount,
      quoteCount,
      invoiceCount,
      projectCount,
      revenueMinor: revenue._sum.amountMinor ?? 0,
    },
    recentAudit,
  };
}

export async function listUsers() {
  return prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      email: true,
      emailVerified: true,
      isPlatformAdmin: true,
      suspendedAt: true,
      createdAt: true,
      memberships: {
        select: {
          role: true,
          organization: { select: { id: true, name: true } },
        },
      },
    },
  });
}

export async function listAuditLog(limit = 100) {
  return prisma.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      actor: { select: { email: true } },
      organization: { select: { name: true } },
    },
  });
}

// ---------------------------------------------------------------------------
// Mutations (toutes journalisées)
// ---------------------------------------------------------------------------

export async function setOrganizationSuspended(
  admin: PlatformAdmin,
  orgId: string,
  suspended: boolean,
) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true },
  });
  if (!org) throw new PlatformAdminError("Organisation introuvable.");

  await prisma.organization.update({
    where: { id: orgId },
    data: { suspendedAt: suspended ? new Date() : null },
  });
  await audit(
    admin.id,
    suspended ? "platform.org_suspended" : "platform.org_reactivated",
    "Organization",
    orgId,
    { name: org.name },
    orgId,
  );
}

export async function setUserSuspended(
  admin: PlatformAdmin,
  userId: string,
  suspended: boolean,
) {
  if (userId === admin.id) {
    throw new PlatformAdminError("Vous ne pouvez pas suspendre votre propre compte.");
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) throw new PlatformAdminError("Utilisateur introuvable.");

  // Suspendre = bloquer l'accès ET révoquer immédiatement les sessions actives.
  await prisma.$transaction([
    prisma.user.update({
      where: { id: userId },
      data: { suspendedAt: suspended ? new Date() : null },
    }),
    ...(suspended ? [prisma.session.deleteMany({ where: { userId } })] : []),
  ]);
  await audit(
    admin.id,
    suspended ? "platform.user_suspended" : "platform.user_reactivated",
    "User",
    userId,
    { email: user.email },
  );
}

export async function setUserPlatformAdmin(
  admin: PlatformAdmin,
  userId: string,
  value: boolean,
) {
  if (userId === admin.id && !value) {
    throw new PlatformAdminError("Vous ne pouvez pas retirer votre propre accès plateforme.");
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true, isPlatformAdmin: true },
  });
  if (!user) throw new PlatformAdminError("Utilisateur introuvable.");

  if (!value) {
    const admins = await prisma.user.count({ where: { isPlatformAdmin: true } });
    if (admins <= 1) {
      throw new PlatformAdminError(
        "Impossible de retirer le dernier administrateur de plateforme.",
      );
    }
  }

  await prisma.user.update({
    where: { id: userId },
    data: { isPlatformAdmin: value },
  });
  await audit(
    admin.id,
    value ? "platform.admin_granted" : "platform.admin_revoked",
    "User",
    userId,
    { email: user.email },
  );
}

export async function revokeUserSessions(admin: PlatformAdmin, userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, email: true },
  });
  if (!user) throw new PlatformAdminError("Utilisateur introuvable.");

  const { count } = await prisma.session.deleteMany({ where: { userId } });
  await audit(admin.id, "platform.sessions_revoked", "User", userId, {
    email: user.email,
    count,
  });
  return count;
}
