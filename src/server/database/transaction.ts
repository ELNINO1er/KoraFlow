import { Prisma } from "@prisma/client";
import { prisma } from "./client";

const MAX_ATTEMPTS = 5;

/**
 * Conflit de transaction que l'on peut rejouer. MySQL annule la transaction sur
 * un interblocage (1213) ou un délai de verrou (1205) : Prisma le signale en P2034,
 * ou en P2010 lorsque la requête en cause est du SQL brut.
 */
function isTransactionConflict(error: unknown) {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code === "P2034") return true;
  return error.code === "P2010" && /\b(1213|1205)\b/.test(error.message);
}

/** Rejoue une transaction complète tant qu'elle échoue sur un conflit. */
export async function retryOnConflict<T>(run: () => Promise<T>): Promise<T> {
  for (let attempt = 1; ; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      if (!isTransactionConflict(error) || attempt === MAX_ATTEMPTS) throw error;
      // Décalage aléatoire : deux transactions rejouées ne se recroisent pas.
      await new Promise((resolve) => setTimeout(resolve, Math.random() * 40 * attempt));
    }
  }
}

/** Transaction ordinaire avec rejeu sur conflit (ex. : réservation d'un numéro de document). */
export function transaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return retryOnConflict(() => prisma.$transaction(operation));
}

/** Transaction SÉRIALISABLE avec rejeu sur conflit. */
export function serializableTransaction<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>): Promise<T> {
  return retryOnConflict(() => prisma.$transaction(operation, { isolationLevel: "Serializable" }));
}
