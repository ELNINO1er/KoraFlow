import type { DocumentArchiveType } from "@prisma/client";
import { resolveSession } from "@/server/auth/context";
import { can, type Resource } from "@/server/permissions/permissions";
import { getArchiveById } from "@/server/repositories/document-archive-repository";
import { getPrivateFile } from "@/server/storage/private-storage";
import { pdfResponse } from "@/lib/http/pdf-response";

/** Ressource de permission correspondant au type de document archivé. */
const RESOURCE_BY_TYPE: Record<DocumentArchiveType, Resource> = {
  CONTRACT: "contracts",
  QUOTE: "quotes",
  INVOICE: "invoices",
};

/**
 * Téléchargement de la version ARCHIVÉE (figée) d'un document finalisé.
 * Authentifié, scopé à l'organisation ET soumis à la permission de consultation
 * du TYPE de document (contrat/devis/facture). Un utilisateur sans ce droit, ou
 * d'une autre organisation, reçoit 404/403 même s'il connaît l'identifiant.
 * Sert le PDF réellement conservé (non régénéré).
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await resolveSession();
  if (session.status !== "ok") return new Response("Non autorisé", { status: 401 });
  const { id } = await params;
  const archive = await getArchiveById(session.context.organizationId, id);
  if (!archive || archive.status !== "STORED" || !archive.pdfStorageKey) {
    return new Response("Archive introuvable", { status: 404 });
  }
  if (!can(session.context.role, `${RESOURCE_BY_TYPE[archive.documentType]}.view`)) {
    return new Response("Accès refusé", { status: 403 });
  }
  let bytes: Buffer;
  try {
    bytes = await getPrivateFile(archive.pdfStorageKey);
  } catch {
    return new Response("Fichier archivé indisponible", { status: 404 });
  }
  const snapshot = archive.snapshot as { number?: string } | null;
  const base = snapshot?.number ?? "document";
  return pdfResponse(bytes, `${base}-archive-v${archive.version}.pdf`);
}
