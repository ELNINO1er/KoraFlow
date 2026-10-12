import "dotenv/config";
import { randomBytes } from "node:crypto";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Régénère les jetons publics hérités d'un ancien schéma (longueur ≠ 48 car.)
 * pour qu'ils respectent le format attendu par le validateur
 * (`/^[a-f0-9]{48}$/`). Les jetons conformes sont laissés intacts.
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL manquant (voir .env).");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const token = () => randomBytes(24).toString("hex"); // 48 car. hex
const isLegacy = (t: string | null) => !!t && !/^[a-f0-9]{48}$/.test(t);

async function main() {
  let fixed = 0;

  const quotes = await prisma.quote.findMany({ where: { publicToken: { not: null } }, select: { id: true, publicToken: true } });
  for (const q of quotes) if (isLegacy(q.publicToken)) { await prisma.quote.update({ where: { id: q.id }, data: { publicToken: token() } }); fixed++; }

  const invoices = await prisma.invoice.findMany({ where: { publicToken: { not: null } }, select: { id: true, publicToken: true } });
  for (const i of invoices) if (isLegacy(i.publicToken)) { await prisma.invoice.update({ where: { id: i.id }, data: { publicToken: token() } }); fixed++; }

  const contracts = await prisma.contract.findMany({ where: { publicToken: { not: null } }, select: { id: true, publicToken: true } });
  for (const c of contracts) if (isLegacy(c.publicToken)) { await prisma.contract.update({ where: { id: c.id }, data: { publicToken: token() } }); fixed++; }

  const contacts = await prisma.contact.findMany({ where: { portalToken: { not: null } }, select: { id: true, portalToken: true } });
  for (const c of contacts) if (isLegacy(c.portalToken)) { await prisma.contact.update({ where: { id: c.id }, data: { portalToken: token() } }); fixed++; }

  console.log(`✔ ${fixed} jeton(s) hérité(s) régénéré(s) au format 48 caractères.`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error("Échec :", e); await prisma.$disconnect(); process.exit(1); });
