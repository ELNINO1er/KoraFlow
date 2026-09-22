import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Client Prisma en singleton, connecté via le driver adapter PostgreSQL
 * (Prisma 7 — moteur sans Rust). En développement, le hot-reload de Next.js
 * réévalue les modules ; sans ce cache global, chaque rechargement créerait un
 * nouveau client et saturerait le pool de connexions.
 *
 * IMPORTANT : ce client N'EST PAS scopé multi-tenant. L'isolation par
 * `organizationId` sera appliquée dans la couche repositories (sprint 1.5).
 * Ne jamais l'utiliser directement depuis un composant/route sans passer par
 * un service qui garantit le filtrage tenant.
 */
const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error(
    "DATABASE_URL est manquant. Renseignez-le dans .env (voir .env.example).",
  );
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const adapter = new PrismaPg({ connectionString });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
