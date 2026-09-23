import "server-only";
import type { AuthContext } from "../auth/context";
import { prisma } from "../database/client";

export interface NotifyInput {
  type: string;
  title: string;
  body?: string;
  link?: string;
}

export interface NotifyOptions {
  /** Envoie aussi un e-mail à chaque membre (best-effort). Réservé aux événements importants. */
  email?: boolean;
}

/**
 * Crée une notification in-app pour chaque membre de l'organisation, et
 * optionnellement un e-mail. Effet de bord système (pas de contrôle de
 * permission) déclenché par les événements métier.
 */
export async function notifyOrg(
  organizationId: string,
  input: NotifyInput,
  options: NotifyOptions = {},
) {
  const members = await prisma.membership.findMany({
    where: { organizationId },
    select: { userId: true, user: { select: { email: true } } },
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

  if (options.email) {
    const { sendEmail } = await import("../integrations/email/mailer");
    const appUrl = process.env.APP_URL ?? "";
    const link = input.link ? `${appUrl}${input.link}` : null;
    const emails = [...new Set(members.map((m) => m.user.email).filter(Boolean))];
    await Promise.allSettled(
      emails.map((to) =>
        sendEmail({
          to,
          subject: input.title,
          html: `<p>${input.title}</p>${input.body ? `<p>${input.body}</p>` : ""}${link ? `<p><a href="${link}">Voir dans KoraFlow</a></p>` : ""}`,
          text: `${input.title}${input.body ? ` — ${input.body}` : ""}${link ? ` : ${link}` : ""}`,
        }),
      ),
    );
  }
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
