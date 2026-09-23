import type { MembershipRole } from "@prisma/client";
import { prisma } from "../database/client";

/** Membres et invitations d'une organisation — enforcement multi-tenant. */

export function listMembers(organizationId: string) {
  return prisma.membership.findMany({
    where: { organizationId },
    orderBy: { createdAt: "asc" },
    include: { user: { select: { id: true, name: true, email: true, image: true } } },
  });
}

export function countOwners(organizationId: string) {
  return prisma.membership.count({ where: { organizationId, role: "OWNER" } });
}

export function getMembership(organizationId: string, membershipId: string) {
  return prisma.membership.findFirst({ where: { id: membershipId, organizationId } });
}

export async function updateMemberRole(organizationId: string, membershipId: string, role: MembershipRole) {
  const result = await prisma.membership.updateMany({
    where: { id: membershipId, organizationId },
    data: { role },
  });
  return result.count > 0;
}

export async function removeMember(organizationId: string, membershipId: string) {
  const result = await prisma.membership.deleteMany({ where: { id: membershipId, organizationId } });
  return result.count > 0;
}

export function membershipExists(organizationId: string, userId: string) {
  return prisma.membership.findUnique({
    where: { userId_organizationId: { userId, organizationId } },
    select: { id: true },
  });
}

// --- Invitations ------------------------------------------------------------

export function createInvitation(
  organizationId: string,
  data: { email: string; role: MembershipRole; token: string; expiresAt: Date; invitedById?: string },
) {
  return prisma.invitation.upsert({
    where: { organizationId_email: { organizationId, email: data.email } },
    update: { role: data.role, token: data.token, expiresAt: data.expiresAt, status: "PENDING", invitedById: data.invitedById },
    create: {
      organizationId,
      email: data.email,
      role: data.role,
      token: data.token,
      expiresAt: data.expiresAt,
      status: "PENDING",
      invitedById: data.invitedById,
    },
  });
}

export function listPendingInvitations(organizationId: string) {
  return prisma.invitation.findMany({
    where: { organizationId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
  });
}

export async function cancelInvitation(organizationId: string, id: string) {
  const result = await prisma.invitation.updateMany({
    where: { id, organizationId, status: "PENDING" },
    data: { status: "CANCELED" },
  });
  return result.count > 0;
}

export function getInvitationByToken(token: string) {
  return prisma.invitation.findUnique({
    where: { token },
    include: { organization: { select: { id: true, name: true } } },
  });
}

/** Accepte une invitation : crée l'appartenance (si absente) et marque l'invitation ACCEPTED. */
export async function acceptInvitation(
  token: string,
  userId: string,
): Promise<{ ok: boolean; organizationId?: string; error?: string }> {
  const invitation = await prisma.invitation.findUnique({ where: { token } });
  if (!invitation) return { ok: false, error: "Invitation introuvable." };
  if (invitation.status !== "PENDING") return { ok: false, error: "Invitation déjà traitée." };
  if (invitation.expiresAt < new Date()) return { ok: false, error: "Invitation expirée." };

  await prisma.$transaction(async (tx) => {
    const existing = await tx.membership.findUnique({
      where: { userId_organizationId: { userId, organizationId: invitation.organizationId } },
      select: { id: true },
    });
    if (!existing) {
      await tx.membership.create({
        data: { userId, organizationId: invitation.organizationId, role: invitation.role },
      });
    }
    await tx.invitation.update({ where: { id: invitation.id }, data: { status: "ACCEPTED" } });
    await tx.auditLog.create({
      data: { organizationId: invitation.organizationId, actorUserId: userId, action: "invitation.accepted", targetType: "Invitation", targetId: invitation.id },
    });
  });

  return { ok: true, organizationId: invitation.organizationId };
}
