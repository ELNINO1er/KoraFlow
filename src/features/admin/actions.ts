"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { MembershipRole } from "@prisma/client";
import { requirePlatformAdmin } from "@/server/auth/platform";
import { auth } from "@/server/auth/auth";
import { prisma } from "@/server/database/client";
import * as svc from "@/server/services/platform-admin";

type Result = { ok: boolean; error?: string };

function toResult(e: unknown): Result {
  // Ne jamais avaler les erreurs de contrôle de flux Next (redirect/notFound).
  if (e && typeof e === "object" && "digest" in e) {
    const digest = String((e as { digest?: unknown }).digest ?? "");
    if (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND") throw e;
  }
  if (e instanceof svc.PlatformAdminError) return { ok: false, error: e.message };
  // Erreurs de l'API Better Auth (plugin admin) : message lisible, sans détail sensible.
  if (e instanceof Error && e.message) return { ok: false, error: e.message };
  throw e;
}

export async function suspendOrgAction(
  orgId: string,
  suspended: boolean,
): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    await svc.setOrganizationSuspended(admin, orgId, suspended);
    revalidatePath("/admin/organizations");
    revalidatePath(`/admin/organizations/${orgId}`);
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function suspendUserAction(
  userId: string,
  suspended: boolean,
): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    await svc.setUserSuspended(admin, userId, suspended);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function setPlatformAdminAction(
  userId: string,
  value: boolean,
): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    await svc.setUserPlatformAdmin(admin, userId, value);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function revokeSessionsAction(userId: string): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    await svc.revokeUserSessions(admin, userId);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

// --- Organisations ---------------------------------------------------------

export async function updateOrgAction(
  orgId: string,
  data: svc.OrgEditableFields,
): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    await svc.updateOrganization(admin, orgId, data);
    revalidatePath(`/admin/organizations/${orgId}`);
    revalidatePath("/admin/organizations");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function deleteOrgAction(orgId: string): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    await svc.softDeleteOrganization(admin, orgId);
    revalidatePath("/admin/organizations");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function restoreOrgAction(orgId: string): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    await svc.restoreOrganization(admin, orgId);
    revalidatePath(`/admin/organizations/${orgId}`);
    revalidatePath("/admin/organizations");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function addMemberAction(
  orgId: string,
  email: string,
  role: MembershipRole,
): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    await svc.addOrgMember(admin, orgId, email, role);
    revalidatePath(`/admin/organizations/${orgId}`);
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function changeMemberRoleAction(
  orgId: string,
  membershipId: string,
  role: MembershipRole,
): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    await svc.changeOrgMemberRole(admin, orgId, membershipId, role);
    revalidatePath(`/admin/organizations/${orgId}`);
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function removeMemberAction(
  orgId: string,
  membershipId: string,
): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    await svc.removeOrgMember(admin, orgId, membershipId);
    revalidatePath(`/admin/organizations/${orgId}`);
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

// --- Utilisateurs (opérations via le plugin admin Better Auth) --------------

export async function forceVerifyEmailAction(userId: string): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    await svc.forceVerifyEmail(admin, userId);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function sendResetEmailAction(userId: string): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true },
    });
    if (!user) return { ok: false, error: "Utilisateur introuvable." };

    await auth.api.requestPasswordReset({
      body: { email: user.email, redirectTo: "/reinitialiser-mot-de-passe" },
      headers: await headers(),
    });
    await svc.recordPlatformAudit(admin.id, "platform.password_reset_sent", "User", userId, {
      email: user.email,
    });
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function createUserAction(
  email: string,
  name: string,
  password: string,
): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    const normalized = email.toLowerCase().trim();
    if (!/^\S+@\S+\.\S+$/.test(normalized)) return { ok: false, error: "E-mail invalide." };
    if (password.length < 8) return { ok: false, error: "Mot de passe : 8 caractères minimum." };

    const created = await auth.api.createUser({
      body: { email: normalized, password, name: name.trim() || normalized, role: "user" },
      headers: await headers(),
    });
    // Compte créé par un admin : on considère l'e-mail vérifié (utilisable de suite).
    const newUserId = created?.user?.id;
    if (newUserId) {
      await prisma.user.update({ where: { id: newUserId }, data: { emailVerified: true } });
      await svc.recordPlatformAudit(admin.id, "platform.user_created", "User", newUserId, {
        email: normalized,
      });
    }
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function deleteUserAction(userId: string): Promise<Result> {
  const admin = await requirePlatformAdmin();
  if (userId === admin.id) return { ok: false, error: "Vous ne pouvez pas supprimer votre propre compte." };
  try {
    const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
    await auth.api.removeUser({ body: { userId }, headers: await headers() });
    await svc.recordPlatformAudit(admin.id, "platform.user_deleted", "User", userId, {
      email: user?.email ?? null,
    });
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

// --- Impersonation ---------------------------------------------------------

export async function impersonateAction(userId: string): Promise<Result> {
  const admin = await requirePlatformAdmin();
  if (userId === admin.id) return { ok: false, error: "Impersonation de soi-même inutile." };

  try {
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, suspendedAt: true },
    });
    if (!target) return { ok: false, error: "Utilisateur introuvable." };
    if (target.suspendedAt) return { ok: false, error: "Impossible d'impersonner un compte suspendu." };

    await auth.api.impersonateUser({ body: { userId }, headers: await headers() });
    await svc.recordPlatformAudit(admin.id, "platform.impersonation_started", "User", userId, {
      email: target.email,
    });
  } catch (e) {
    return toResult(e);
  }
  // Hors du try : redirect() lève une erreur de contrôle de flux volontaire.
  redirect("/dashboard");
}

export async function stopImpersonatingAction(): Promise<void> {
  await auth.api.stopImpersonating({ headers: await headers() });
  redirect("/admin/users");
}
