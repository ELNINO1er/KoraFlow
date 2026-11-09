import { types, Client } from "pg";
import { createConnection } from "mariadb";

/**
 * Copie une fois pour toutes les données de l'ancienne base PostgreSQL vers MySQL.
 * La source n'est que lue. La cible doit avoir reçu les migrations et être VIDE :
 * tout est copié dans une seule transaction, annulée à la première erreur.
 *
 *   SOURCE_DATABASE_URL="postgresql://…" TARGET_DATABASE_URL="mysql://…" \
 *     npx tsx scripts/copy-postgres-to-mysql.ts
 */
const source = process.env.SOURCE_DATABASE_URL;
const target = process.env.TARGET_DATABASE_URL;
if (!source || !target) throw new Error("SOURCE_DATABASE_URL et TARGET_DATABASE_URL sont requis.");

// Prisma stocke des « timestamp » sans fuseau, en UTC : pg les lirait en heure locale.
types.setTypeParser(1114, (value) => new Date(`${value.replace(" ", "T")}Z`));

const BATCH = 500;
const sourceUrl = new URL(source);
const targetUrl = new URL(target);

async function main() {
  const local = ["localhost", "127.0.0.1"].includes(sourceUrl.hostname);
  sourceUrl.searchParams.delete("sslmode");
  sourceUrl.searchParams.delete("schema");
  const pg = new Client({ connectionString: sourceUrl.toString(), ssl: local ? false : { rejectUnauthorized: false } });
  await pg.connect();
  const my = await createConnection({
    host: targetUrl.hostname,
    port: targetUrl.port ? Number(targetUrl.port) : 3306,
    user: decodeURIComponent(targetUrl.username),
    password: decodeURIComponent(targetUrl.password),
    database: targetUrl.pathname.slice(1),
    timezone: "Z",
    bigIntAsNumber: true,
  });

  try {
    const tables: { name: string }[] = await my.query(
      "SELECT TABLE_NAME AS name FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME <> '_prisma_migrations'",
    );
    for (const { name } of tables) {
      const [{ total }] = await my.query(`SELECT COUNT(*) AS total FROM \`${name}\``);
      if (Number(total) > 0) throw new Error(`La table cible « ${name} » n'est pas vide : copie annulée.`);
    }

    // MariaDB sous Windows met les noms de tables en minuscules.
    const { rows: sourceTables } = await pg.query("SELECT tablename FROM pg_tables WHERE schemaname = 'public'");
    const sourceName = new Map(sourceTables.map((t: { tablename: string }) => [t.tablename.toLowerCase(), t.tablename]));

    await my.query("SET FOREIGN_KEY_CHECKS = 0");
    await my.beginTransaction();
    const report: [string, number][] = [];
    for (const { name } of tables) {
      const columns: { name: string }[] = await my.query(
        "SELECT COLUMN_NAME AS name FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION",
        [name],
      );
      const names = columns.map((c) => c.name);
      const from = sourceName.get(name.toLowerCase());
      if (!from) throw new Error(`Table source introuvable : ${name}`);
      const { rows } = await pg.query(`SELECT ${names.map((c) => `"${c}"`).join(", ")} FROM "${from}"`);
      const values = rows.map((row) =>
        names.map((c) => {
          const v = row[c];
          // Colonnes Json et ancien tableau `options` : stockés en JSON côté MySQL.
          return v !== null && typeof v === "object" && !(v instanceof Date) ? JSON.stringify(v) : v;
        }),
      );
      const insert = `INSERT INTO \`${name}\` (${names.map((c) => `\`${c}\``).join(", ")}) VALUES (${names.map(() => "?").join(", ")})`;
      for (let i = 0; i < values.length; i += BATCH) await my.batch(insert, values.slice(i, i + BATCH));
      report.push([name, values.length]);
    }
    await my.commit();
    await my.query("SET FOREIGN_KEY_CHECKS = 1");

    // Vérification : mêmes volumes des deux côtés.
    let mismatch = false;
    for (const [name, copied] of report) {
      const [{ total }] = await my.query(`SELECT COUNT(*) AS total FROM \`${name}\``);
      const ok = Number(total) === copied;
      mismatch ||= !ok;
      if (copied > 0 || !ok) console.log(`${ok ? "ok " : "ÉCART"} ${name} : ${copied}`);
    }
    console.log(mismatch ? "Copie terminée AVEC ÉCARTS." : "Copie terminée, volumes identiques.");
    if (mismatch) process.exitCode = 1;
  } catch (error) {
    await my.rollback().catch(() => {});
    throw error;
  } finally {
    await my.end();
    await pg.end();
  }
}

main();
