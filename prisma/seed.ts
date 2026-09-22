import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Seed de démonstration — données FICTIVES uniquement.
 * Idempotent : peut être relancé sans créer de doublons (upsert sur clés uniques).
 *
 * Crée une organisation de démo avec un propriétaire, pour disposer d'un tenant
 * de travail pendant le développement du socle (auth, permissions, isolation).
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL manquant (voir .env).");
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const owner = await prisma.user.upsert({
    where: { email: "proprietaire@demo.koraflow.test" },
    update: {},
    create: {
      email: "proprietaire@demo.koraflow.test",
      name: "Awa Konaté",
      emailVerified: true,
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: "agence-demo" },
    update: {},
    create: {
      name: "Agence Démo",
      slug: "agence-demo",
      legalName: "Agence Démo SARL",
      email: "contact@demo.koraflow.test",
      phone: "+225 07 00 00 00 00",
      city: "Abidjan",
      country: "CI",
      currency: "XOF",
      timezone: "Africa/Abidjan",
      locale: "fr",
    },
  });

  await prisma.membership.upsert({
    where: {
      userId_organizationId: { userId: owner.id, organizationId: org.id },
    },
    update: { role: "OWNER" },
    create: {
      userId: owner.id,
      organizationId: org.id,
      role: "OWNER",
    },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: org.id,
      actorUserId: owner.id,
      action: "seed.demo_organization_created",
      targetType: "Organization",
      targetId: org.id,
      metadata: { source: "prisma/seed.ts" },
    },
  });

  console.log("Seed terminé :");
  console.log(`  Organisation : ${org.name} (${org.slug}) — ${org.id}`);
  console.log(`  Propriétaire : ${owner.name} <${owner.email}> — ${owner.id}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Échec du seed :", error);
    await prisma.$disconnect();
    process.exit(1);
  });
