"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { MembershipRole } from "@prisma/client";
import { requirePlatformAdmin } from "@/server/auth/platform";
import { auth } from "@/server/auth/auth";
import { prisma } from "@/server/database/client";
import * as svc from "@/server/services/platform-admin";
import { randomUUID } from "node:crypto";
import { z } from "zod";
import { rateLimit } from "@/lib/security/rate-limit";
import { newAdminSchema, sensitiveConfirmationSchema, type SensitiveConfirmation } from "@/lib/admin/validation";

type Result = { ok: boolean; error?: string; message?: string };

function refreshAdmin() {
  revalidatePath("/admin", "layout");
}

async function confirmSensitiveAction(adminId: string, input: SensitiveConfirmation | undefined) {
  const parsed = sensitiveConfirmationSchema.safeParse(input);
  if (!parsed.success) throw new svc.PlatformAdminError("Saisissez votre mot de passe et un motif de 5 à 500 caractères.");
  if (!rateLimit(`admin-confirm:${adminId}`, 10, 10 * 60_000).ok) {
    throw new svc.PlatformAdminError("Trop de tentatives. Réessayez dans 10 minutes.");
  }
  try {
    await auth.api.verifyPassword({ headers: await headers(), body: { password: parsed.data.password } });
  } catch {
    throw new svc.PlatformAdminError("Mot de passe incorrect ou session expirée. Reconnectez-vous si nécessaire.");
  }
  return parsed.data.reason;
}

function toResult(e: unknown): Result {
  // Ne jamais avaler les erreurs de contrôle de flux Next (redirect/notFound).
  if (e && typeof e === "object" && "digest" in e) {
    const digest = String((e as { digest?: unknown }).digest ?? "");
    if (digest.startsWith("NEXT_REDIRECT") || digest === "NEXT_NOT_FOUND") throw e;
  }
  if (e instanceof svc.PlatformAdminError) return { ok: false, error: e.message };
  // Database/provider details never cross the action boundary.
  console.error("Platform administration failed", e instanceof Error ? e.name : "UnknownError");
  return { ok: false, error: "L’opération a échoué. Réessayez ou consultez les journaux serveur." };
}

export async function suspendOrgAction(
  orgId: string,
  suspended: boolean,
  confirmation?: SensitiveConfirmation,
): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    if (typeof suspended !== "boolean") return { ok: false, error: "Statut invalide." };
    const reason = await confirmSensitiveAction(admin.id, confirmation);
    await svc.setOrganizationSuspended(admin, orgId, suspended, reason);
    refreshAdmin();
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function suspendUserAction(
  userId: string,
  suspended: boolean,
  confirmation?: SensitiveConfirmation,
): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    if (typeof suspended !== "boolean") return { ok: false, error: "Statut invalide." };
    const reason = await confirmSensitiveAction(admin.id, confirmation);
    await svc.setUserSuspended(admin, userId, suspended, reason);
    refreshAdmin();
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function setPlatformAdminAction(
  userId: string,
  value: boolean,
  confirmation?: SensitiveConfirmation,
): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    if (typeof value !== "boolean") return { ok: false, error: "Statut invalide." };
    const reason = await confirmSensitiveAction(admin.id, confirmation);
    await svc.setUserPlatformAdmin(admin, userId, value, reason);
    refreshAdmin();
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

export async function deleteOrgAction(orgId: string, confirmation?: SensitiveConfirmation): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    const reason = await confirmSensitiveAction(admin.id, confirmation);
    await svc.softDeleteOrganization(admin, orgId, reason);
    refreshAdmin();
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

export async function deleteUserAction(userId: string, confirmation?: SensitiveConfirmation): Promise<Result> {
  const admin = await requirePlatformAdmin();
  if (userId === admin.id) return { ok: false, error: "Vous ne pouvez pas supprimer votre propre compte." };
  try {
    const reason = await confirmSensitiveAction(admin.id, confirmation);
    await svc.deletePlatformUser(admin, userId, reason);
    refreshAdmin();
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

// --- Impersonation ---------------------------------------------------------

export async function impersonateAction(userId: string, confirmation?: SensitiveConfirmation): Promise<Result> {
  const admin = await requirePlatformAdmin();
  if (userId === admin.id) return { ok: false, error: "Impersonation de soi-même inutile." };

  try {
    const reason = await confirmSensitiveAction(admin.id, confirmation);
    const target = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, suspendedAt: true, isPlatformAdmin: true },
    });
    if (!target) return { ok: false, error: "Utilisateur introuvable." };
    if (target.suspendedAt) return { ok: false, error: "Impossible d'impersonner un compte suspendu." };
    if (target.isPlatformAdmin) return { ok: false, error: "La connexion en tant qu’un autre administrateur est interdite." };
    const membership = await prisma.membership.findFirst({ where: {
      userId, organization: { deletedAt: null, suspendedAt: null },
    }, select: { id: true } });
    if (!membership) return { ok: false, error: "Ce compte n’a aucune organisation active à consulter." };

    // Record intent before issuing a support session, so audit failure cannot create an untracked session.
    await svc.recordPlatformAudit(admin.id, "platform.impersonation_requested", "User", userId, { email: target.email, reason });
    await auth.api.impersonateUser({ body: { userId }, headers: await headers() });
    try {
      await svc.recordPlatformAudit(admin.id, "platform.impersonation_started", "User", userId, { email: target.email, reason });
    } catch { console.error("Support session started; completion audit unavailable (intent recorded)."); }
  } catch (e) {
    return toResult(e);
  }
  // Hors du try : redirect() lève une erreur de contrôle de flux volontaire.
  redirect("/dashboard");
}

export async function stopImpersonatingAction(): Promise<void> {
  const session = await auth.api.getSession({ headers: await headers() });
  const actorId = session?.session.impersonatedBy;
  if (!actorId || !session) redirect("/admin/users");
  await auth.api.stopImpersonating({ headers: await headers() });
  try { await svc.recordPlatformAudit(actorId, "platform.impersonation_stopped", "User", session.user.id); }
  catch { console.error("Support session stopped; completion audit unavailable."); }
  redirect("/admin/users");
}

export async function promoteAdminByEmailAction(email: string, confirmation: SensitiveConfirmation): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    const parsed = z.email().safeParse(email.trim().toLowerCase());
    if (!parsed.success) return { ok: false, error: "Adresse e-mail invalide." };
    const reason = await confirmSensitiveAction(admin.id, confirmation);
    const user = await prisma.user.findUnique({ where: { email: parsed.data }, select: { id: true, isPlatformAdmin: true } });
    if (!user) return { ok: false, error: "Aucun compte ne correspond à cet e-mail. Utilisez « Nouveau compte »." };
    if (user.isPlatformAdmin) return { ok: false, error: "Ce compte est déjà administrateur plateforme." };
    await svc.setUserPlatformAdmin(admin, user.id, true, reason);
    refreshAdmin();
    return { ok: true, message: "Accès administrateur accordé." };
  } catch (e) { return toResult(e); }
}

export async function createPlatformAdminAction(input: { email: string; name: string; initialPassword: string }, confirmation: SensitiveConfirmation): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    const parsed = newAdminSchema.safeParse(input);
    if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Informations invalides." };
    const reason = await confirmSensitiveAction(admin.id, confirmation);
    const { email, name, initialPassword } = parsed.data;
    // Use Better Auth's configured password implementation; create account and audit atomically.
    const password = await (await auth.$context).password.hash(initialPassword);
    await svc.adminMutation(admin, async (tx) => {
      if (await tx.user.findUnique({ where: { email }, select: { id: true } })) {
        throw new svc.PlatformAdminError("Ce compte existe déjà. Utilisez « Compte existant ».");
      }
      const user = await tx.user.create({ data: {
        email, name, isPlatformAdmin: true, role: "admin", emailVerified: false,
      } });
      await tx.account.create({ data: { id: randomUUID(), accountId: user.id, userId: user.id, providerId: "credential", password } });
      await tx.auditLog.create({ data: {
        actorUserId: admin.id, action: "platform.admin_created", targetType: "User", targetId: user.id,
        metadata: { email, name, reason, after: { isPlatformAdmin: true } },
      } });
    });
    refreshAdmin();
    try {
      await auth.api.sendVerificationEmail({ body: { email, callbackURL: "/admin" }, headers: await headers() });
    } catch {
      return { ok: true, message: "Administrateur créé. L’e-mail de vérification n’a pas pu être envoyé ; il pourra le redemander à la connexion." };
    }
    return { ok: true, message: "Administrateur créé. Un e-mail lui permet de vérifier son adresse avant sa première connexion." };
  } catch (e) { return toResult(e); }
}

export async function enableAdminTwoFactorAction(password: string): Promise<Result & { totpURI?: string; backupCodes?: string[] }> {
  const admin = await requirePlatformAdmin({ requireTwoFactor: false });
  try {
    if (admin.twoFactorEnabled) return { ok: false, error: "La double authentification est déjà active." };
    if (!z.string().min(1).max(128).safeParse(password).success) return { ok: false, error: "Saisissez votre mot de passe." };
    if (!rateLimit(`admin-2fa:${admin.id}`, 10, 10 * 60_000).ok) return { ok: false, error: "Trop de tentatives. Réessayez dans 10 minutes." };
    const result = await auth.api.enableTwoFactor({ headers: await headers(), body: { password, method: "totp", issuer: "Alymero" } });
    if (result.method !== "totp") return { ok: false, error: "La configuration par application est indisponible." };
    return { ok: true, totpURI: result.totpURI, backupCodes: result.backupCodes };
  } catch { return { ok: false, error: "Activation impossible. Vérifiez votre mot de passe." }; }
}

export async function verifyAdminTwoFactorAction(code: string): Promise<Result> {
  const admin = await requirePlatformAdmin({ requireTwoFactor: false });
  try {
    if (admin.twoFactorEnabled) return { ok: false, error: "La double authentification est déjà active." };
    if (!/^\d{6}$/.test(code)) return { ok: false, error: "Saisissez le code à 6 chiffres." };
    if (!rateLimit(`admin-2fa-verify:${admin.id}`, 10, 10 * 60_000).ok) return { ok: false, error: "Trop de tentatives. Réessayez dans 10 minutes." };
    // Revoke older sessions before enrollment succeeds, even if later audit fails.
    await auth.api.revokeOtherSessions({ headers: await headers() });
    await auth.api.verifyTOTP({ headers: await headers(), body: { code } });
    // Invalidate sessions issued before enrollment; the next login must complete MFA.
    await svc.adminMutation(admin, async (tx) => {
      await tx.session.deleteMany({ where: { userId: admin.id } });
      await tx.auditLog.create({ data: { actorUserId: admin.id, action: "platform.two_factor_enabled", targetType: "User", targetId: admin.id } });
    });
    return { ok: true };
  } catch { return { ok: false, error: "Code invalide ou expiré. Réessayez avec le code actuel de votre application." }; }
}
