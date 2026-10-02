import type { DocumentKind, Prisma } from "@prisma/client";

type TransactionClient = Prisma.TransactionClient;

/**
 * Réserve le prochain numéro d'une séquence dans la transaction appelante.
 * L'upsert PostgreSQL sérialise les incréments concurrents grâce à l'index
 * unique (organisation, type, année).
 */
export async function nextDocumentSequence(
  tx: TransactionClient,
  organizationId: string,
  kind: DocumentKind,
  year: number,
): Promise<number> {
  const sequence = await tx.documentSequence.upsert({
    where: {
      organizationId_kind_year: { organizationId, kind, year },
    },
    create: { organizationId, kind, year, value: 1 },
    update: { value: { increment: 1 } },
    select: { value: true },
  });

  return sequence.value;
}
