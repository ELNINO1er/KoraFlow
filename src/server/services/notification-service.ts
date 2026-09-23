import "server-only";
import type { AuthContext } from "../auth/context";
import { prisma } from "../database/client";

export interface NotifyInput {
  type: string;
  title: string;
  body?: string;
  link?: string;
}

/**
 * Crée une notification pour chaque membre de l'organisation. Effet de bord
 * système (pas de contrôle de permission) déclenché par les événements métier.
 */
export async function notifyOrg(organizationId: string, input: NotifyInput) {
  const members = await prisma.membership.findMany({
    where: { organizationId },
    select: { userId: true },
  });
  if (members.length === 0) return;
  await prisma.notification.createMany({
    data: members.map((m) => ({
      organizationId,
      userId: m.userId,
      type: input.type,
      title: input.title,
      body: input.body,
      link: input.link,
    })),
  });
}

export function listNotifications(ctx: AuthContext, limit = 15) {
  return prisma.notification.findMany({
    where: { organizationId: ctx.organizationId, userId: ctx.user.id },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export function unreadCount(ctx: AuthContext) {
  return prisma.notification.count({
    where: { organizationId: ctx.organizationId, userId: ctx.user.id, readAt: null },
  });
}

export async function markAllRead(ctx: AuthContext) {
  await prisma.notification.updateMany({
    where: { organizationId: ctx.organizationId, userId: ctx.user.id, readAt: null },
    data: { readAt: new Date() },
  });
}
