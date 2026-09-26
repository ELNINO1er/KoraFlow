import "server-only";
import { headers, cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { MembershipRole } from "@prisma/client";
import { auth } from "./auth";
import { prisma } from "../database/client";
import { permissionsForRole, type Permission } from "../permissions/permissions";
import { ACTIVE_ORG_COOKIE } from "@/lib/constants/cookies";

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  image: string | null;
}

export interface ActiveOrganization {
  id: string;
  name: string;
  slug: string;
  currency: string;
  locale: string;
  timezone: string;
}

/**
 * Contexte d'autorisation résolu côté serveur, injecté dans la couche services.
 * C'est la brique centrale du multi-tenant : toute opération métier doit être
 * filtrée par `organizationId` et vérifiée contre `permissions`.
 */
export interface AuthContext {
  user: AuthenticatedUser;
  organizationId: string;
  organization: ActiveOrganization;
  role: MembershipRole;
  permissions: ReadonlySet<Permission>;
  /** Id de l'admin plateforme si la session est une impersonation, sinon null. */
  impersonatedBy: string | null;
}

export type SessionResolution =
  | { status: "unauthenticated" }
  | { status: "suspended"; user: AuthenticatedUser }
  | { status: "no-organization"; user: AuthenticatedUser }
  | { status: "ok"; context: AuthContext };

/**
 * Résout la session Better Auth puis l'organisation active de l'utilisateur.
 * L'organisation active provient du cookie de sélection ; à défaut (ou si le
 * cookie ne correspond à aucune appartenance), la première appartenance sert de
 * repli. L'appartenance est TOUJOURS revérifiée en base : on ne fait jamais
 * confiance au cookie seul.
 */
export async function resolveSession(): Promise<SessionResolution> {
  const session = await auth.api.getSession({ headers: await headers() });

  if (!session?.user) {
    return { status: "unauthenticated" };
  }

  const user: AuthenticatedUser = {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name ?? null,
    image: session.user.image ?? null,
  };

  // Suspension du compte par un admin plateforme : accès bloqué, quel que soit
  // l'état de la session Better Auth (défense côté serveur, à chaque requête).
  const account = await prisma.user.findUnique({
    where: { id: user.id },
    select: { suspendedAt: true },
  });
  if (account?.suspendedAt) {
    return { status: "suspended", user };
  }

  const memberships = await prisma.membership.findMany({
    where: { userId: user.id },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });

  if (memberships.length === 0) {
    return { status: "no-organization", user };
  }

  // Une organisation suspendue ou supprimée est inaccessible ; on ne conserve que
  // les organisations actives. Si toutes celles de l'utilisateur sont
  // suspendues/supprimées, l'accès est bloqué comme pour une suspension de compte.
  const selectable = memberships.filter(
    (m) => !m.organization.suspendedAt && !m.organization.deletedAt,
  );
  const first = selectable[0];
  if (!first) {
    return { status: "suspended", user };
  }

  const cookieStore = await cookies();
  const desiredOrgId = cookieStore.get(ACTIVE_ORG_COOKIE)?.value;
  const membership =
    selectable.find((m) => m.organizationId === desiredOrgId) ?? first;

  const org = membership.organization;

  return {
    status: "ok",
    context: {
      user,
      organizationId: org.id,
      organization: {
        id: org.id,
        name: org.name,
        slug: org.slug,
        currency: org.currency,
        locale: org.locale,
        timezone: org.timezone,
      },
      role: membership.role,
      permissions: permissionsForRole(membership.role),
      impersonatedBy: session.session?.impersonatedBy ?? null,
    },
  };
}

/**
 * Variante stricte pour les pages/actions de l'espace authentifié : renvoie le
 * contexte, ou REDIRIGE (login / création d'organisation) si indisponible.
 */
export async function requireAuthContext(): Promise<AuthContext> {
  const result = await resolveSession();
  if (result.status === "unauthenticated") redirect("/login");
  if (result.status === "suspended") redirect("/compte-suspendu");
  if (result.status === "no-organization") redirect("/create-organization");
  return result.context;
}
