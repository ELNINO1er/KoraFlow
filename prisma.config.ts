import "dotenv/config";
import { defineConfig, env } from "prisma/config";

/**
 * Configuration Prisma 7.
 * L'URL de connexion utilisée par la CLI (migrate, db, studio) est lue depuis
 * DATABASE_URL (.env). Le PrismaClient runtime, lui, se connecte via un driver
 * adapter (voir src/server/database/client.ts).
 */
export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
