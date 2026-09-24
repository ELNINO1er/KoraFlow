import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

/**
 * Bootstrap d'un administrateur de PLATEFORME (super admin transverse).
 *
 * Le drapeau `isPlatformAdmin` n'est volontairement PAS assignable depuis
 * l'interface d'une organisation. Ce script en est la voie d'amorçage : il
 * accorde (ou révoque avec --revoke) l'accès à la console /admin pour un compte
 * EXISTANT (identifié par son e-mail).
 *
 * Usage :
 *   npm run admin:grant -- proprietaire@exemple.com
 *   npm run admin:grant -- proprietaire@exemple.com --revoke
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL manquant (voir .env).");
}

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const args = process.argv.slice(2);
const revoke = args.includes("--revoke");
const email = args.find((a) => !a.startsWith("--"))?.toLowerCase().trim();

if (!email) {
  console.error("Usage : npm run admin:grant -- <email> [--revoke]");
  process.exit(1);
}

async function main() {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`Utilisateur introuvable : ${email}`);
    console.error("Créez d'abord le compte via /register, puis relancez ce script.");
    process.exit(1);
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { isPlatformAdmin: !revoke },
  });

  await prisma.auditLog.create({
    data: {
      actorUserId: null,
      action: revoke ? "platform.admin_revoked" : "platform.admin_granted",
      targetType: "User",
      targetId: user.id,
      metadata: { email, source: "scripts/grant-platform-admin.ts" },
    },
  });

  console.log(
    revoke
      ? `✔ ${email} n'est plus administrateur de plateforme.`
      : `✔ ${email} est désormais administrateur de plateforme. Console : /admin`,
  );
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error("Échec :", error);
    await prisma.$disconnect();
    process.exit(1);
  });
