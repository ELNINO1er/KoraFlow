import { createAuthEndpoint, sessionMiddleware, APIError } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import { prisma } from "../database/client";
import { activityExpiry, IDLE_TIMEOUT_MS } from "@/lib/security/idle-session";

export function idleSessionPlugin() {
  return {
    id: "idle-session",
    endpoints: {
      recordSessionActivity: createAuthEndpoint("/session/activity", {
        method: "POST",
        body: z.object({ idleForMs: z.number().int().min(0).max(IDLE_TIMEOUT_MS - 1) }),
        use: [sessionMiddleware],
      }, async (ctx) => {
        const current = ctx.context.session;
        const now = new Date();
        const idleDeadline = activityExpiry(now.getTime(), ctx.body.idleForMs).getTime();
        const supportDeadline = current.session.impersonatedBy
          ? new Date(current.session.createdAt).getTime() + 15 * 60_000 : Infinity;
        const expiresAt = new Date(Math.min(idleDeadline, supportDeadline));
        if (expiresAt <= now) {
          await prisma.session.deleteMany({ where: { id: current.session.id } });
          throw new APIError("UNAUTHORIZED", { message: "Session de support terminée." });
        }
        await prisma.session.updateMany({
          where: { id: current.session.id, expiresAt: { gt: now, lt: expiresAt }, user: { suspendedAt: null } },
          data: { expiresAt },
        });
        // A delayed request from another tab must not shorten a newer activity deadline.
        const active = await prisma.session.findFirst({
          where: { id: current.session.id, expiresAt: { gt: now }, user: { suspendedAt: null } },
        });
        if (!active) throw new APIError("UNAUTHORIZED", { message: "Session expirée. Reconnectez-vous." });
        await setSessionCookie(ctx, {
          session: active, user: current.user,
        });
        ctx.setHeader("Cache-Control", "no-store");
        return ctx.json({ expiresAt: active.expiresAt.toISOString() });
      }),
    },
  };
}
