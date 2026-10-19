import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

/**
 * Fixture pour la validation navigateur : crée un compte VÉRIFIÉ (owner) + une
 * organisation + un client + un service, avec un mot de passe connu.
 * USAGE TEST UNIQUEMENT (base isolée). N'affaiblit pas l'auth de production :
 * on crée un compte credential normal avec emailVerified=true.
 *   npx tsx scripts/seed-e2e.ts
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL manquant.");
const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const EMAIL = "owner.e2e@koraflow.test";
const PASSWORD = "MotDePasse123!";

async function main() {
  await prisma.user.deleteMany({ where: { email: EMAIL } }).catch(() => {});
  const user = await prisma.user.create({
    data: { email: EMAIL, name: "Owner E2E", emailVerified: true },
  });
  await prisma.account.create({
    data: {
      id: `cred_${user.id}`,
      accountId: user.id,
      providerId: "credential",
      userId: user.id,
      password: await hashPassword(PASSWORD),
    },
  });
  const org = await prisma.organization.create({
    data: { name: "Studio E2E", slug: `studio-e2e-${Date.now().toString(36)}`, currency: "XOF" },
  });
  await prisma.membership.create({ data: { userId: user.id, organizationId: org.id, role: "OWNER" } });
  await prisma.contact.create({
    data: { organizationId: org.id, firstName: "Client", lastName: "Démo", email: "client.demo@example.ci", type: "CLIENT", portalToken: `pt_${user.id}` },
  });
  await prisma.service.create({
    data: { organizationId: org.id, name: "Développement web", priceMinor: 500000, unit: "forfait", taxRate: 18, reference: "SRV-DEMO" },
  });
  console.log(`SEED_OK email=${EMAIL} password=${PASSWORD} org=${org.slug}`);
}
main().finally(() => prisma.$disconnect());
