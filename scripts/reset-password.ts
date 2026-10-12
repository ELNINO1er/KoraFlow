import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { hashPassword } from "better-auth/crypto";

/**
 * Réinitialise le mot de passe d'un compte (credential Better Auth) à une valeur
 * connue — dépannage/démo local uniquement.
 *
 * Usage : npx tsx scripts/reset-password.ts <email> <nouveau-mot-de-passe>
 */
const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL manquant (voir .env).");

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });

const email = process.argv[2]?.toLowerCase().trim();
const newPassword = process.argv[3];

if (!email || !newPassword) {
  console.error("Usage : npx tsx scripts/reset-password.ts <email> <nouveau-mot-de-passe>");
  process.exit(1);
}
if (newPassword.length < 8) {
  console.error("Le mot de passe doit comporter au moins 8 caractères.");
  process.exit(1);
}

// Valeurs garanties définies après les gardes ci-dessus.
const targetEmail: string = email;
const password: string = newPassword;

async function main() {
  const user = await prisma.user.findUnique({ where: { email: targetEmail } });
  if (!user) {
    console.error(`Utilisateur introuvable : ${targetEmail}`);
    process.exit(1);
  }

  const hashed = await hashPassword(password);
  const account = await prisma.account.findFirst({
    where: { userId: user.id, providerId: "credential" },
  });

  if (account) {
    await prisma.account.update({ where: { id: account.id }, data: { password: hashed } });
  } else {
    await prisma.account.create({
      data: {
        id: `cred_${user.id}`,
        accountId: user.id,
        providerId: "credential",
        userId: user.id,
        password: hashed,
      },
    });
  }

  // Un compte connectable doit avoir l'e-mail vérifié.
  if (!user.emailVerified) {
    await prisma.user.update({ where: { id: user.id }, data: { emailVerified: true } });
  }

  console.log(`✔ Mot de passe réinitialisé pour ${targetEmail}.`);
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
