import { PrismaMariaDb } from "@prisma/adapter-mariadb";

/**
 * Driver adapter MySQL/MariaDB, partagé par l'application et les scripts.
 * Le connecteur attend des champs séparés : on décompose DATABASE_URL
 * (mysql://utilisateur:mot-de-passe@hôte:3306/base).
 */
export function createDatabaseAdapter(connectionString: string) {
  const url = new URL(connectionString);
  return new PrismaMariaDb({
    host: url.hostname,
    port: url.port ? Number(url.port) : 3306,
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: Number(url.searchParams.get("connection_limit") ?? 5),
  });
}
