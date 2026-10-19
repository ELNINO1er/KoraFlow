import "server-only";
import { createHash } from "node:crypto";
import type { DocumentArchiveType, Prisma } from "@prisma/client";
import * as archives from "../repositories/document-archive-repository";
import { getLatestStoredArchive } from "../repositories/document-archive-repository";
import { putPrivateFile, getPrivateFile } from "../storage/private-storage";

function sha256(bytes: Uint8Array): string {
  return createHash("sha256").update(bytes).digest("hex");
}

/** Empreinte stable d'un instantané (sert de discriminant de version). */
export function snapshotFingerprint(snapshot: unknown): string {
  return createHash("sha256").update(JSON.stringify(snapshot)).digest("hex");
}

/**
 * Renvoie les octets du PDF ARCHIVÉ (version de référence conservée) d'un
 * document, ou null si aucune archive STORED n'existe / fichier illisible.
 * Les appelants servent ce fichier pour les documents finalisés (jamais une
 * régénération présentée comme l'original).
 */
export async function getStoredArchivePdf(
  organizationId: string,
  documentType: DocumentArchiveType,
  documentId: string,
): Promise<Buffer | null> {
  const archive = await getLatestStoredArchive({ organizationId, documentType, documentId });
  if (!archive?.pdfStorageKey) return null;
  try {
    return await getPrivateFile(archive.pdfStorageKey);
  } catch {
    return null;
  }
}

/** Vrai si l'erreur de stockage signifie « la clé existe déjà » (write-once). */
function isAlreadyExistsError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const e = error as { code?: string; name?: string; $metadata?: { httpStatusCode?: number } };
  return (
    e.code === "EEXIST" || // pilote local (flag "wx")
    e.name === "PreconditionFailed" || // S3 IfNoneMatch
    e.$metadata?.httpStatusCode === 412
  );
}

export interface ArchiveInput {
  organizationId: string;
  documentType: DocumentArchiveType;
  documentId: string;
  reason: string;
  snapshot: Prisma.InputJsonValue;
  contentHash?: string | null;
  pdf: Buffer;
}

export type ArchiveResult =
  | { ok: true; id: string; version: number; pdfSha256: string; reused: boolean }
  | { ok: false; error: string; id?: string };

/**
 * Archive un document finalisé : crée (ou réutilise) une version PENDING, puis
 * conserve le PDF dans le stockage privé en écriture unique (write-once) et
 * passe la ligne en STORED avec l'empreinte du fichier.
 *
 * Garanties :
 *  - Idempotent : rappeler avec le même (document, raison) ne crée pas de doublon
 *    et ne ré-écrit pas un PDF déjà conservé.
 *  - Cohérence PG/stockage : si l'écriture échoue, la ligne reste FAILED
 *    (reprise possible) ; une clé déjà présente est traitée comme un succès
 *    (reprise), l'empreinte stockée étant celle du fichier réellement conservé.
 *  - Jamais de remplacement silencieux d'un fichier archivé.
 */
export async function archiveDocument(input: ArchiveInput): Promise<ArchiveResult> {
  const { archive, created } = await archives.createOrReusePendingArchive({
    organizationId: input.organizationId,
    documentType: input.documentType,
    documentId: input.documentId,
    reason: input.reason,
    snapshot: input.snapshot,
    contentHash: input.contentHash ?? null,
  });

  if (archive.status === "STORED") {
    return { ok: true, id: archive.id, version: archive.version, pdfSha256: archive.pdfSha256 ?? "", reused: true };
  }

  const key = archive.pdfStorageKey!;
  let pdfSha256 = sha256(input.pdf);
  try {
    await putPrivateFile(key, input.pdf);
  } catch (error) {
    if (!isAlreadyExistsError(error)) {
      await archives.markArchiveFailed(archive.id);
      return {
        ok: false,
        id: archive.id,
        error: error instanceof Error ? error.message : "Échec du stockage de l'archive.",
      };
    }
    // Clé déjà présente (reprise) : on NE fait PAS confiance à l'empreinte
    // calculée localement — on relit le fichier RÉELLEMENT conservé et on
    // utilise son empreinte. Si la relecture échoue, on NE passe PAS en STORED
    // (l'archive reste FAILED pour une reprise ultérieure) : jamais déclarer
    // valide un fichier non vérifié, ni réutiliser l'empreinte d'un autre PDF.
    try {
      pdfSha256 = sha256(await getPrivateFile(key));
    } catch {
      await archives.markArchiveFailed(archive.id);
      return {
        ok: false,
        id: archive.id,
        error: "Fichier déjà présent mais illisible : archive laissée en échec pour reprise.",
      };
    }
  }

  await archives.markArchiveStored(archive.id, pdfSha256);
  return { ok: true, id: archive.id, version: archive.version, pdfSha256, reused: !created };
}
