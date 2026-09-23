"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { cookies, headers } from "next/headers";
import type { MembershipRole } from "@prisma/client";
import { resolveSession, type AuthContext } from "@/server/auth/context";
import { auth } from "@/server/auth/auth";
import * as teamService from "@/server/services/team-service";
import { getInvitationByToken, acceptInvitation } from "@/server/repositories/membership-repository";
import { ACTIVE_ORG_COOKIE } from "@/lib/constants/cookies";
import { PermissionError } from "@/server/permissions/permissions";

async function getContext(): Promise<AuthContext> {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "no-organization") redirect("/create-organization");
  return session.context;
}

export async function inviteMemberAction(email: string, role: MembershipRole): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getContext();
  try {
    const result = await teamService.inviteMember(ctx, email, role);
    revalidatePath("/equipe");
    return result;
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    throw e;
  }
}

export async function cancelInvitationAction(id: string) {
  const ctx = await getContext();
  try {
    await teamService.cancelInvitation(ctx, id);
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath("/equipe");
}

export async function changeRoleAction(membershipId: string, role: MembershipRole): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getContext();
  try {
    const result = await teamService.changeMemberRole(ctx, membershipId, role);
    revalidatePath("/equipe");
    return result;
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    throw e;
  }
}

export async function removeMemberAction(membershipId: string): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getContext();
  try {
    const result = await teamService.removeMember(ctx, membershipId);
    revalidatePath("/equipe");
    return result;
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    throw e;
  }
}

/** Acceptation d'une invitation par l'utilisateur connecté (e-mail devant correspondre). */
export async function acceptInvitationAction(token: string): Promise<{ ok: boolean; error?: string }> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect(`/login`);

  const invitation = await getInvitationByToken(token);
  if (!invitation) return { ok: false, error: "Invitation introuvable." };
  if (session.user.email.toLowerCase() !== invitation.email.toLowerCase()) {
    return { ok: false, error: `Cette invitation est destinée à ${invitation.email}.` };
  }

  const result = await acceptInvitation(token, session.user.id);
  if (!result.ok) return { ok: false, error: result.error };

  const store = await cookies();
  store.set(ACTIVE_ORG_COOKIE, result.organizationId!, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
  redirect("/dashboard");
}
