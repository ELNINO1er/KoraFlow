import "server-only";
import { randomBytes } from "node:crypto";
import type { MembershipRole } from "@prisma/client";
import type { AuthContext } from "../auth/context";
import { assertCan } from "../permissions/permissions";
import { prisma } from "../database/client";
import * as team from "../repositories/membership-repository";

export class TeamError extends Error {}

export async function listTeam(ctx: AuthContext) {
  assertCan(ctx.role, "members.view");
  const [members, invitations] = await Promise.all([
    team.listMembers(ctx.organizationId),
    team.listPendingInvitations(ctx.organizationId),
  ]);
  return { members, invitations };
}

export async function inviteMember(ctx: AuthContext, email: string, role: MembershipRole) {
  assertCan(ctx.role, "members.manage");
  if (!/^\S+@\S+\.\S+$/.test(email)) return { ok: false as const, error: "E-mail invalide." };
  if (role === "OWNER" && ctx.role !== "OWNER") {
    return { ok: false as const, error: "Seul un propriétaire peut inviter un propriétaire." };
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 3600 * 1000);
  const invitation = await team.createInvitation(ctx.organizationId, {
    email: email.toLowerCase().trim(),
    role,
    token,
    expiresAt,
    invitedById: ctx.user.id,
  });

  await prisma.auditLog.create({
    data: { organizationId: ctx.organizationId, actorUserId: ctx.user.id, action: "invitation.created", targetType: "Invitation", targetId: invitation.id, metadata: { email, role } },
  });

  try {
    const { sendEmail } = await import("../integrations/email/mailer");
    const link = `${process.env.APP_URL ?? ""}/invitations/${token}`;
    await sendEmail({
      to: email,
      subject: `Invitation à rejoindre ${ctx.organization.name} sur KoraFlow`,
      html: `<p>Bonjour,</p>
<p>${ctx.user.name ?? "Un membre"} vous invite à rejoindre <strong>${ctx.organization.name}</strong> sur KoraFlow.</p>
<p><a href="${link}">Accepter l'invitation</a></p>
<p>Ce lien expire dans 7 jours.</p>`,
      text: `Vous êtes invité à rejoindre ${ctx.organization.name} : ${link}`,
    });
  } catch {
    // L'échec d'envoi n'annule pas l'invitation.
  }

  return { ok: true as const };
}

export async function cancelInvitation(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "members.manage");
  return team.cancelInvitation(ctx.organizationId, id);
}

export async function changeMemberRole(ctx: AuthContext, membershipId: string, role: MembershipRole) {
  assertCan(ctx.role, "members.manage");
  const membership = await team.getMembership(ctx.organizationId, membershipId);
  if (!membership) return { ok: false as const, error: "Membre introuvable." };

  if (role === "OWNER" && ctx.role !== "OWNER") {
    return { ok: false as const, error: "Seul un propriétaire peut nommer un propriétaire." };
  }
  if (membership.role === "OWNER" && role !== "OWNER") {
    const owners = await team.countOwners(ctx.organizationId);
    if (owners <= 1) return { ok: false as const, error: "Impossible de rétrograder le dernier propriétaire." };
  }

  await team.updateMemberRole(ctx.organizationId, membershipId, role);
  await prisma.auditLog.create({
    data: { organizationId: ctx.organizationId, actorUserId: ctx.user.id, action: "membership.role_changed", targetType: "Membership", targetId: membershipId, metadata: { role } },
  });
  return { ok: true as const };
}

export async function removeMember(ctx: AuthContext, membershipId: string) {
  assertCan(ctx.role, "members.manage");
  const membership = await team.getMembership(ctx.organizationId, membershipId);
  if (!membership) return { ok: false as const, error: "Membre introuvable." };

  if (membership.role === "OWNER") {
    const owners = await team.countOwners(ctx.organizationId);
    if (owners <= 1) return { ok: false as const, error: "Impossible de retirer le dernier propriétaire." };
  }

  await team.removeMember(ctx.organizationId, membershipId);
  await prisma.auditLog.create({
    data: { organizationId: ctx.organizationId, actorUserId: ctx.user.id, action: "membership.removed", targetType: "Membership", targetId: membershipId },
  });
  return { ok: true as const };
}
