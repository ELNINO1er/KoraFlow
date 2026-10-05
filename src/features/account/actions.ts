"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { auth } from "@/server/auth/auth";
import { requireAuthContext } from "@/server/auth/context";
import { prisma } from "@/server/database/client";

export type AccountActionResult = { ok: boolean; error?: string; message?: string };

export async function updateProfileAction(name: string): Promise<AccountActionResult> {
  const parsed = z.string().trim().min(2).max(120).safeParse(name);
  if (!parsed.success) return { ok: false, error: "Le nom doit contenir entre 2 et 120 caractères." };

  const ctx = await requireAuthContext();
  try {
    await auth.api.updateUser({ headers: await headers(), body: { name: parsed.data } });
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        actorUserId: ctx.user.id,
        action: "account.profile_updated",
        targetType: "User",
        targetId: ctx.user.id,
      },
    });
    revalidatePath("/compte");
    revalidatePath("/dashboard");
    return { ok: true, message: "Votre nom a été mis à jour." };
  } catch {
    return { ok: false, error: "Impossible de modifier votre nom pour le moment." };
  }
}

export async function requestEmailChangeAction(newEmail: string): Promise<AccountActionResult> {
  const parsed = z.email().safeParse(newEmail.trim().toLowerCase());
  if (!parsed.success) return { ok: false, error: "Saisissez une adresse e-mail valide." };

  const ctx = await requireAuthContext();
  if (parsed.data === ctx.user.email.toLowerCase()) {
    return { ok: false, error: "Cette adresse est déjà associée à votre compte." };
  }

  // Better Auth masque volontairement l'existence d'un compte et peut répondre
  // comme si l'e-mail était parti. Dans cet espace déjà authentifié, un message
  // explicite évite à l'utilisateur d'attendre un courrier qui ne sera pas émis.
  const existingUser = await prisma.user.findUnique({
    where: { email: parsed.data },
    select: { id: true },
  });
  if (existingUser) {
    return {
      ok: false,
      error: "Cette adresse e-mail appartient déjà à un autre compte. Connectez-vous avec ce compte ou utilisez une autre adresse.",
    };
  }

  try {
    await auth.api.changeEmail({
      headers: await headers(),
      body: { newEmail: parsed.data, callbackURL: "/compte" },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        actorUserId: ctx.user.id,
        action: "account.email_change_requested",
        targetType: "User",
        targetId: ctx.user.id,
      },
    });
    return {
      ok: true,
      message: "Un lien de confirmation a été envoyé à la nouvelle adresse.",
    };
  } catch {
    return { ok: false, error: "Impossible de demander ce changement d’e-mail." };
  }
}

export async function changePasswordAction(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<AccountActionResult> {
  const parsed = z.object({
    currentPassword: z.string().min(1),
    newPassword: z.string().min(8).max(128),
    confirmPassword: z.string(),
  }).safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Le nouveau mot de passe doit comporter au moins 8 caractères." };
  }
  if (parsed.data.newPassword !== parsed.data.confirmPassword) {
    return { ok: false, error: "Les deux nouveaux mots de passe ne correspondent pas." };
  }
  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return { ok: false, error: "Choisissez un mot de passe différent de l’actuel." };
  }

  const ctx = await requireAuthContext();
  try {
    await auth.api.changePassword({
      headers: await headers(),
      body: {
        currentPassword: parsed.data.currentPassword,
        newPassword: parsed.data.newPassword,
        revokeOtherSessions: true,
      },
    });
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        actorUserId: ctx.user.id,
        action: "account.password_changed",
        targetType: "User",
        targetId: ctx.user.id,
      },
    });
    return {
      ok: true,
      message: "Mot de passe modifié. Les autres sessions ont été déconnectées.",
    };
  } catch {
    return { ok: false, error: "Le mot de passe actuel est incorrect ou la modification a échoué." };
  }
}
