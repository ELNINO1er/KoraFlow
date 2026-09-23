import { prisma } from "@/server/database/client";

/**
 * Sonde de santé (readiness) : vérifie la connexion à PostgreSQL.
 * Utile pour l'orchestration/monitoring (uptime, load balancer).
 * Aucune donnée sensible n'est exposée.
 */
export async function GET() {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return Response.json({ status: "ok", db: "up" });
  } catch {
    return Response.json({ status: "error", db: "down" }, { status: 503 });
  }
}
