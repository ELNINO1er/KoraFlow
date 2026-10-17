import "server-only";
import type { Prisma, MembershipRole } from "@prisma/client";
import type { PlatformAdmin } from "../auth/platform";
import { prisma } from "../database/client";
import { parseAdminQuery, pagination, type AdminSearchParams } from "@/lib/admin/query";
import { organizationEditSchema } from "@/lib/admin/validation";

/**
 * Service d'administration de PLATEFORME.
 *
 * ⚠️ Contrairement au reste de l'application, ces requêtes ne sont PAS scopées
 * par `organizationId` : elles traversent délibérément l'isolation multi-tenant.
 * C'est pourquoi elles vivent dans un module dédié, appelées UNIQUEMENT après
 * `requirePlatformAdmin()` (voir src/server/auth/platform.ts). Toute mutation est
 * journalisée dans l'audit avec l'acteur (admin plateforme).
 */
export class PlatformAdminError extends Error { }

/** Serializes console mutations so concurrent changes cannot remove every owner/admin. */
export async function adminMutation<T>(admin: PlatformAdmin, run: (tx: Prisma.TransactionClient) => Promise<T>) {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(41726001)`;
    const actor = await tx.user.findUnique({ where: { id: admin.id }, select: { isPlatformAdmin: true, suspendedAt: true } });
    if (!actor?.isPlatformAdmin || actor.suspendedAt) throw new PlatformAdminError("Accès administrateur requis.");
    return run(tx);
  }, { timeout: 15_000 });
}

function transactionAudit(tx: Prisma.TransactionClient) {
  return (adminId: string, action: string, targetType: string, targetId: string, metadata?: Prisma.InputJsonValue, organizationId?: string | null) =>
    audit(adminId, action, targetType, targetId, metadata, organizationId, tx);
}

async function audit(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Prisma.InputJsonValue,
  organizationId?: string | null,
  db: Prisma.TransactionClient = prisma,
) {
  await db.auditLog.create({
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

/** Journalise une action plateforme (exposé pour la couche actions). */
export async function recordPlatformAudit(
  adminId: string,
  action: string,
  targetType: string,
  targetId: string,
  metadata?: Prisma.InputJsonValue,
  organizationId?: string | null,
) {
  await audit(adminId, action, targetType, targetId, metadata, organizationId);
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
    prisma.organization.count({ where: { deletedAt: null } }),
    prisma.organization.count({ where: { deletedAt: null, suspendedAt: { not: null } } }),
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
      where: { deletedAt: null },
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

export async function listOrganizations(params: AdminSearchParams = {}) {
  const query = parseAdminQuery(params);
  const where: Prisma.OrganizationWhereInput = {
    deletedAt: query.status === "deleted" ? { not: null } : null,
    ...(query.status === "active" ? { suspendedAt: null } : {}),
    ...(query.status === "suspended" ? { suspendedAt: { not: null } } : {}),
    ...(query.q ? { OR: ["name", "slug", "id", "email"].map((field) => ({ [field]: { contains: query.q, mode: "insensitive" } })) } : {}),
  };
  const paging = pagination(await prisma.organization.count({ where }), query.page);
  const orgs = await prisma.organization.findMany({
    where, orderBy: [{ createdAt: query.sort }, { id: query.sort }], skip: paging.skip, take: paging.take,
    select: { id: true, name: true, slug: true, currency: true, createdAt: true, suspendedAt: true, deletedAt: true },
  });
  const organizationId = { in: orgs.map((org) => org.id) };
  const [members, contacts, invoices, revenue] = await Promise.all([
    prisma.membership.groupBy({ by: ["organizationId"], where: { organizationId }, _count: { _all: true } }),
    prisma.contact.groupBy({ by: ["organizationId"], where: { organizationId, deletedAt: null }, _count: { _all: true } }),
    prisma.invoice.groupBy({ by: ["organizationId"], where: { organizationId, deletedAt: null }, _count: { _all: true } }),
    prisma.payment.groupBy({
      by: ["organizationId"],
      where: { organizationId, status: "CONFIRMED" },
      _sum: { amountMinor: true },
    }),
  ]);

  const memberMap = new Map(members.map((r) => [r.organizationId, r._count._all]));
  const contactMap = new Map(contacts.map((r) => [r.organizationId, r._count._all]));
  const invoiceMap = new Map(invoices.map((r) => [r.organizationId, r._count._all]));
  const revenueMap = new Map(revenue.map((r) => [r.organizationId, r._sum.amountMinor ?? 0]));

  return {
    ...paging, query, items: orgs.map((o) => ({
      ...o,
      memberCount: memberMap.get(o.id) ?? 0,
      contactCount: contactMap.get(o.id) ?? 0,
      invoiceCount: invoiceMap.get(o.id) ?? 0,
      revenueMinor: revenueMap.get(o.id) ?? 0,
    }))
  };
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

export async function listUsers(params: AdminSearchParams = {}) {
  const query = parseAdminQuery(params);
  const where: Prisma.UserWhereInput = {
    ...(query.status === "active" ? { suspendedAt: null } : {}),
    ...(query.status === "suspended" ? { suspendedAt: { not: null } } : {}),
    ...(query.status === "admin" ? { isPlatformAdmin: true } : {}),
    ...(query.status === "unverified" ? { emailVerified: false } : {}),
    ...(query.status === "no-organization" ? { memberships: { none: {} } } : {}),
    ...(query.q ? {
      OR: [
        ...["name", "email", "id"].map((field) => ({ [field]: { contains: query.q, mode: "insensitive" } })),
        { memberships: { some: { organization: { name: { contains: query.q, mode: "insensitive" } } } } },
      ]
    } : {}),
  };
  const paging = pagination(await prisma.user.count({ where }), query.page);
  const items = await prisma.user.findMany({
    where, skip: paging.skip, take: paging.take,
    orderBy: [{ createdAt: query.sort }, { id: query.sort }],
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
  return { ...paging, query, items };
}

function auditWhere(query: ReturnType<typeof parseAdminQuery>): Prisma.AuditLogWhereInput {
  return {
    AND: [
      ...(query.q ? [{ OR: ["action", "targetId", "targetType"].map((field) => ({ [field]: { contains: query.q, mode: "insensitive" } })) }] : []),
      ...(query.organization ? [{
        OR: [
          { organizationId: query.organization },
          { organization: { name: { contains: query.organization, mode: "insensitive" as const } } },
        ]
      }] : []),
    ],
    ...(query.actor ? { actor: { email: { contains: query.actor, mode: "insensitive" } } } : {}),
    ...(query.action ? { action: query.action } : {}),
    ...((query.from || query.to) ? {
      createdAt: {
        ...(query.from ? { gte: new Date(`${query.from}T00:00:00.000Z`) } : {}),
        ...(query.to ? { lt: new Date(new Date(`${query.to}T00:00:00.000Z`).getTime() + 86_400_000) } : {}),
      }
    } : {}),
  };
}

export async function listAuditLog(params: AdminSearchParams = {}) {
  const query = parseAdminQuery(params);
  const where = auditWhere(query);
  const paging = pagination(await prisma.auditLog.count({ where }), query.page);
  const items = await prisma.auditLog.findMany({
    where, orderBy: [{ createdAt: query.sort }, { id: query.sort }],
    take: paging.take, skip: paging.skip,
    include: {
      actor: { select: { email: true } },
      organization: { select: { name: true } },
    },
  });
  return { ...paging, query, items };
}

export async function getPlatformUserDetail(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId }, select: {
      id: true, name: true, email: true, emailVerified: true, createdAt: true, isPlatformAdmin: true, suspendedAt: true,
      memberships: { select: { id: true, role: true, organization: { select: { id: true, name: true, deletedAt: true, suspendedAt: true } } } },
      sessions: {
        where: { expiresAt: { gt: new Date() } }, orderBy: { createdAt: "desc" }, take: 20,
        select: { id: true, createdAt: true, expiresAt: true, ipAddress: true, userAgent: true, impersonatedBy: true },
      },
    }
  });
}

// ---------------------------------------------------------------------------
// Mutations (toutes journalisées)
// ---------------------------------------------------------------------------

export async function setOrganizationSuspended(
  admin: PlatformAdmin,
  orgId: string,
  suspended: boolean,
  reason?: string,
) {
  return adminMutation(admin, async (tx) => {
    const audit = transactionAudit(tx);
    const org = await tx.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true },
    });
    if (!org) throw new PlatformAdminError("Organisation introuvable.");

    await tx.organization.update({
      where: { id: orgId },
      data: { suspendedAt: suspended ? new Date() : null },
    });
    await audit(
      admin.id,
      suspended ? "platform.org_suspended" : "platform.org_reactivated",
      "Organization",
      orgId,
      { name: org.name, reason: reason ?? null, after: { suspended } },
      orgId,
    );
  });
}

export async function setUserSuspended(
  admin: PlatformAdmin,
  userId: string,
  suspended: boolean,
  reason?: string,
) {
  return adminMutation(admin, async (tx) => {
    const audit = transactionAudit(tx);
    if (userId === admin.id) {
      throw new PlatformAdminError("Vous ne pouvez pas suspendre votre propre compte.");
    }
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) throw new PlatformAdminError("Utilisateur introuvable.");

    // Suspendre = bloquer l'accès ET révoquer immédiatement les sessions actives.
    await tx.user.update({ where: { id: userId }, data: { suspendedAt: suspended ? new Date() : null } });
    if (suspended) await tx.session.deleteMany({ where: { userId } });
    await audit(
      admin.id,
      suspended ? "platform.user_suspended" : "platform.user_reactivated",
      "User",
      userId,
      { email: user.email, reason: reason ?? null, after: { suspended } },
    );
  });
}

export async function setUserPlatformAdmin(
  admin: PlatformAdmin,
  userId: string,
  value: boolean,
  reason?: string,
) {
  return adminMutation(admin, async (tx) => {
    const audit = transactionAudit(tx);
    if (userId === admin.id && !value) {
      throw new PlatformAdminError("Vous ne pouvez pas retirer votre propre accès plateforme.");
    }
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, isPlatformAdmin: true, suspendedAt: true },
    });
    if (!user) throw new PlatformAdminError("Utilisateur introuvable.");

    if (value && user.suspendedAt) throw new PlatformAdminError("Réactivez ce compte avant de le promouvoir.");
    if (value === user.isPlatformAdmin) return;

    if (!value && !user.suspendedAt) {
      const admins = await tx.user.count({ where: { isPlatformAdmin: true, suspendedAt: null } });
      if (admins <= 1) {
        throw new PlatformAdminError(
          "Impossible de retirer le dernier administrateur de plateforme.",
        );
      }
    }

    // On synchronise `role` avec le drapeau : le plugin admin Better Auth autorise
    // ses endpoints (impersonation, gestion de comptes) via role === "admin".
    await tx.user.update({
      where: { id: userId },
      data: { isPlatformAdmin: value, role: value ? "admin" : "user" },
    });
    await audit(
      admin.id,
      value ? "platform.admin_granted" : "platform.admin_revoked",
      "User",
      userId,
      { email: user.email, reason: reason ?? null, before: { isPlatformAdmin: user.isPlatformAdmin }, after: { isPlatformAdmin: value } },
    );
  });
}

export async function revokeUserSessions(admin: PlatformAdmin, userId: string) {
  return adminMutation(admin, async (tx) => {
    const audit = transactionAudit(tx);
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true },
    });
    if (!user) throw new PlatformAdminError("Utilisateur introuvable.");

    const { count } = await tx.session.deleteMany({ where: { userId } });
    await audit(admin.id, "platform.sessions_revoked", "User", userId, {
      email: user.email,
      count,
    });
    return count;
  });
}

// ---------------------------------------------------------------------------
// Gestion des organisations (édition, membres, suppression logique)
// ---------------------------------------------------------------------------

export interface OrgEditableFields {
  name: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  country: string;
  currency: string;
  timezone: string;
  locale: string;
}

export async function updateOrganization(
  admin: PlatformAdmin,
  orgId: string,
  data: OrgEditableFields,
) {
  return adminMutation(admin, async (tx) => {
    const audit = transactionAudit(tx);
    const parsed = organizationEditSchema.safeParse(data);
    if (!parsed.success) throw new PlatformAdminError("Profil invalide : vérifiez le nom, l’e-mail, le pays, la devise, la langue et le fuseau horaire.");
    data = parsed.data;
    const org = await tx.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, legalName: true, email: true, phone: true, city: true, country: true, currency: true, timezone: true, locale: true },
    });
    if (!org) throw new PlatformAdminError("Organisation introuvable.");
    if (data.name.trim().length < 2) {
      throw new PlatformAdminError("Le nom doit comporter au moins 2 caractères.");
    }

    const updated = await tx.organization.update({
      where: { id: orgId },
      data: {
        name: data.name.trim(),
        legalName: data.legalName?.trim() || null,
        email: data.email?.trim() || null,
        phone: data.phone?.trim() || null,
        city: data.city?.trim() || null,
        country: (data.country || "CI").toUpperCase().slice(0, 2),
        currency: (data.currency || "XOF").toUpperCase().slice(0, 3),
        timezone: data.timezone || "Africa/Abidjan",
        locale: data.locale || "fr",
      },
    });
    const before = Object.fromEntries(Object.keys(data).map((key) => [key, org[key as keyof typeof data]]));
    const after = Object.fromEntries(Object.keys(data).map((key) => [key, updated[key as keyof typeof data]]));
    await audit(admin.id, "platform.org_updated", "Organization", orgId, { before, after }, orgId);
  });
}

export async function softDeleteOrganization(admin: PlatformAdmin, orgId: string, reason?: string) {
  return adminMutation(admin, async (tx) => {
    const audit = transactionAudit(tx);
    const org = await tx.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true, deletedAt: true },
    });
    if (!org) throw new PlatformAdminError("Organisation introuvable.");
    if (org.deletedAt) throw new PlatformAdminError("Organisation déjà supprimée.");

    await tx.organization.update({
      where: { id: orgId },
      data: { deletedAt: new Date() },
    });
    await audit(admin.id, "platform.org_deleted", "Organization", orgId, { name: org.name, reason: reason ?? null }, orgId);
  });
}

export async function restoreOrganization(admin: PlatformAdmin, orgId: string) {
  return adminMutation(admin, async (tx) => {
    const audit = transactionAudit(tx);
    const org = await tx.organization.findUnique({
      where: { id: orgId },
      select: { id: true, name: true },
    });
    if (!org) throw new PlatformAdminError("Organisation introuvable.");

    await tx.organization.update({
      where: { id: orgId },
      data: { deletedAt: null },
    });
    await audit(admin.id, "platform.org_restored", "Organization", orgId, { name: org.name }, orgId);
  });
}

export async function addOrgMember(
  admin: PlatformAdmin,
  orgId: string,
  email: string,
  role: MembershipRole,
) {
  return adminMutation(admin, async (tx) => {
    const audit = transactionAudit(tx);
    const normalized = email.toLowerCase().trim();
    const user = await tx.user.findUnique({ where: { email: normalized } });
    if (!user) {
      throw new PlatformAdminError(
        "Aucun compte avec cet e-mail. Créez d'abord l'utilisateur.",
      );
    }
    const existing = await tx.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId: orgId } },
    });
    if (existing) throw new PlatformAdminError("Cet utilisateur est déjà membre.");

    const membership = await tx.membership.create({
      data: { userId: user.id, organizationId: orgId, role },
    });
    await audit(admin.id, "platform.member_added", "Membership", membership.id, { email: normalized, role }, orgId);
  });
}

export async function changeOrgMemberRole(
  admin: PlatformAdmin,
  orgId: string,
  membershipId: string,
  role: MembershipRole,
) {
  return adminMutation(admin, async (tx) => {
    const audit = transactionAudit(tx);
    const membership = await tx.membership.findFirst({
      where: { id: membershipId, organizationId: orgId },
    });
    if (!membership) throw new PlatformAdminError("Membre introuvable.");

    if (membership.role === "OWNER" && role !== "OWNER") {
      const owners = await tx.membership.count({
        where: { organizationId: orgId, role: "OWNER" },
      });
      if (owners <= 1) {
        throw new PlatformAdminError("Impossible de rétrograder le dernier propriétaire.");
      }
    }

    await tx.membership.update({ where: { id: membershipId }, data: { role } });
    await audit(admin.id, "platform.member_role_changed", "Membership", membershipId, { before: { role: membership.role }, after: { role } }, orgId);
  });
}

export async function removeOrgMember(
  admin: PlatformAdmin,
  orgId: string,
  membershipId: string,
) {
  return adminMutation(admin, async (tx) => {
    const audit = transactionAudit(tx);
    const membership = await tx.membership.findFirst({
      where: { id: membershipId, organizationId: orgId },
    });
    if (!membership) throw new PlatformAdminError("Membre introuvable.");

    if (membership.role === "OWNER") {
      const owners = await tx.membership.count({
        where: { organizationId: orgId, role: "OWNER" },
      });
      if (owners <= 1) {
        throw new PlatformAdminError("Impossible de retirer le dernier propriétaire.");
      }
    }

    await tx.membership.delete({ where: { id: membershipId } });
    await audit(admin.id, "platform.member_removed", "Membership", membershipId, undefined, orgId);
  });
}

export async function forceVerifyEmail(admin: PlatformAdmin, userId: string) {
  return adminMutation(admin, async (tx) => {
    const audit = transactionAudit(tx);
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, emailVerified: true },
    });
    if (!user) throw new PlatformAdminError("Utilisateur introuvable.");
    if (user.emailVerified) return;

    await tx.user.update({ where: { id: userId }, data: { emailVerified: true } });
    await audit(admin.id, "platform.email_verified", "User", userId, { email: user.email });
  });
}


export async function deletePlatformUser(admin: PlatformAdmin, userId: string, reason: string) {
  return adminMutation(admin, async (tx) => {
    if (userId === admin.id) throw new PlatformAdminError("Vous ne pouvez pas supprimer votre propre compte.");
    const user = await tx.user.findUnique({ where: { id: userId }, select: { email: true, isPlatformAdmin: true } });
    if (!user) throw new PlatformAdminError("Utilisateur introuvable.");
    if (user.isPlatformAdmin) throw new PlatformAdminError("Retirez d’abord l’accès administrateur de ce compte.");
    const owned = await tx.membership.findMany({ where: { userId, role: "OWNER" }, select: { organizationId: true } });
    for (const { organizationId } of owned) {
      if (await tx.membership.count({ where: { organizationId, role: "OWNER", userId: { not: userId } } }) === 0) {
        throw new PlatformAdminError("Ce compte est le dernier propriétaire d’une organisation. Transférez la propriété avant de le supprimer.");
      }
    }
    await tx.user.delete({ where: { id: userId } });
    await audit(admin.id, "platform.user_deleted", "User", userId, { email: user.email, reason }, null, tx);
  });
}

// ---------------------------------------------------------------------------
// Consultation en lecture seule des données d'une organisation (support)
// ---------------------------------------------------------------------------

export async function getOrganizationData(orgId: string, admin: PlatformAdmin) {
  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, name: true, currency: true },
  });
  if (!org) return null;

  const [contacts, quotes, invoices, projects] = await Promise.all([
    prisma.contact.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, firstName: true, lastName: true, email: true, type: true, stage: true, createdAt: true },
    }),
    prisma.quote.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, number: true, status: true, totalMinor: true, currency: true, createdAt: true },
    }),
    prisma.invoice.findMany({
      where: { organizationId: orgId },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, number: true, status: true, totalMinor: true, currency: true, createdAt: true },
    }),
    prisma.project.findMany({
      where: { organizationId: orgId, deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 50,
      select: { id: true, title: true, status: true, progress: true, createdAt: true },
    }),
  ]);

  await recordPlatformAudit(admin.id, "platform.org_data_viewed", "Organization", orgId, undefined, orgId);
  return { org, contacts, quotes, invoices, projects };
}
