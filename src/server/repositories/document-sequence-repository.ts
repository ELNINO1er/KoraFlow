import { randomUUID } from "node:crypto";
import type { DocumentKind, Prisma } from "@prisma/client";

type TransactionClient = Prisma.TransactionClient;

/**
 * Réserve le prochain numéro d'une séquence dans la transaction appelante.
 * L'upsert de Prisma n'est pas atomique sur MySQL : ON DUPLICATE KEY UPDATE
 * sérialise les incréments concurrents grâce à l'index unique
 * (organisation, type, année).
 */
export async function nextDocumentSequence(
  tx: TransactionClient,
  organizationId: string,
  kind: DocumentKind,
  year: number,
): Promise<number> {
  await tx.$executeRaw`
    INSERT INTO document_sequence (id, organizationId, kind, year, value, createdAt, updatedAt)
    VALUES (${randomUUID()}, ${organizationId}, ${kind}, ${year}, 1, NOW(3), NOW(3))
    ON DUPLICATE KEY UPDATE value = value + 1, updatedAt = NOW(3)`;
  const sequence = await tx.documentSequence.findUniqueOrThrow({
    where: { organizationId_kind_year: { organizationId, kind, year } },
    select: { value: true },
  });

  return sequence.value;
}
