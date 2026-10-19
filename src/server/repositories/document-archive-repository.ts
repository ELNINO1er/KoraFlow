import { randomBytes } from "node:crypto";
import { Prisma, type DocumentArchiveType } from "@prisma/client";
import { prisma } from "../database/client";

/**
 * Couche d'accès aux archives de documents finalisés — enforcement multi-tenant.
 * Les fonctions « par jeton » (téléchargement public) ne sont pas scopées : le
 * jeton est le secret d'accès.
 */

async function serializableTransaction<T>(
  operation: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  const maxAttempts = 5;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      return await prisma.$transaction(operation, { isolationLevel: "Serializable" });
    } catch (error) {
      const retryable =
        error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2034";
      if (!retryable || attempt === maxAttempts) throw error;
    }
  }
  throw new Error("Transaction d'archivage impossible.");
}

export interface ArchiveSelector {
  organizationId: string;
  documentType: DocumentArchiveType;
  documentId: string;
}

/** Archive déjà STORED pour ce (document, raison), le cas échéant. */
export function findStoredArchive(sel: ArchiveSelector, reason: string) {
  return prisma.documentArchive.findFirst({
    where: { ...sel, reason, status: "STORED" },
    orderBy: { version: "desc" },
  });
}

/** Archive en PENDING/FAILED réutilisable pour reprise (même document+raison). */
export function findReusableArchive(sel: ArchiveSelector, reason: string) {
  return prisma.documentArchive.findFirst({
    where: { ...sel, reason, status: { in: ["PENDING", "FAILED"] } },
    orderBy: { version: "desc" },
  });
}

export interface CreatePendingArchiveInput extends ArchiveSelector {
  reason: string;
  snapshot: Prisma.InputJsonValue;
  contentHash?: string | null;
}

/**
 * Crée (ou réutilise) une ligne d'archive en PENDING, de façon atomique et sûre
 * en concurrence : la version est le max+1 pour ce document. Si une archive
 * STORED existe déjà pour (document, raison), elle est renvoyée telle quelle
 * (idempotence). Si une archive PENDING/FAILED existe, elle est réutilisée
 * (reprise, pas de doublon).
 */
export function createOrReusePendingArchive(input: CreatePendingArchiveInput) {
  const sel: ArchiveSelector = {
    organizationId: input.organizationId,
    documentType: input.documentType,
    documentId: input.documentId,
  };
  const contentHash = input.contentHash ?? null;
  return serializableTransaction(async (tx) => {
    // Idempotence par (document, raison, empreinte de contenu) : une simple
    // reprise (même contenu) réutilise la ligne ; un document CORRIGÉ (empreinte
    // différente) donne une NOUVELLE version, sans écraser l'ancienne.
    const stored = await tx.documentArchive.findFirst({
      where: { ...sel, reason: input.reason, contentHash, status: "STORED" },
      orderBy: { version: "desc" },
    });
    if (stored) return { archive: stored, created: false as const };

    const reusable = await tx.documentArchive.findFirst({
      where: { ...sel, reason: input.reason, contentHash, status: { in: ["PENDING", "FAILED"] } },
      orderBy: { version: "desc" },
    });
    if (reusable) return { archive: reusable, created: false as const };

    const max = await tx.documentArchive.aggregate({
      where: sel,
      _max: { version: true },
    });
    const version = (max._max.version ?? 0) + 1;
    const archive = await tx.documentArchive.create({
      data: {
        ...sel,
        version,
        reason: input.reason,
        snapshot: input.snapshot,
        contentHash: input.contentHash ?? null,
        pdfStorageKey: `archives/${sel.organizationId}/${sel.documentType}/${sel.documentId}/v${version}.pdf`,
        publicToken: randomBytes(24).toString("hex"),
        status: "PENDING",
      },
    });
    return { archive, created: true as const };
  });
}

export async function markArchiveStored(id: string, pdfSha256: string) {
  await prisma.documentArchive.update({
    where: { id },
    data: { status: "STORED", pdfSha256 },
  });
}

export async function markArchiveFailed(id: string) {
  await prisma.documentArchive.update({
    where: { id },
    data: { status: "FAILED" },
  });
}

export function getArchiveById(organizationId: string, id: string) {
  return prisma.documentArchive.findFirst({ where: { id, organizationId } });
}

export function getArchiveByToken(token: string) {
  return prisma.documentArchive.findFirst({ where: { publicToken: token, status: "STORED" } });
}

/** Dernière archive STORED d'un document (version de référence à servir). */
export function getLatestStoredArchive(sel: ArchiveSelector) {
  return prisma.documentArchive.findFirst({
    where: { ...sel, status: "STORED" },
    orderBy: { version: "desc" },
  });
}

export function listArchivesForDocument(sel: ArchiveSelector) {
  return prisma.documentArchive.findMany({
    where: sel,
    orderBy: { version: "desc" },
  });
}
