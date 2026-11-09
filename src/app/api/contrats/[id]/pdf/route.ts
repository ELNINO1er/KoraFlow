import { requireAuthContext } from "@/server/auth/context";
import { PermissionError } from "@/server/permissions/permissions";
import { getContractPdfForDownload } from "@/server/services/document-download";
import { pdfResponse } from "@/lib/http/pdf-response";

/** Téléchargement du PDF d'un contrat : droit de lecture vérifié avant tout accès à l'archive. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAuthContext();
  const { id } = await params;
  try {
    const pdf = await getContractPdfForDownload(ctx, id);
    if (!pdf) return Response.json({ error: "Contrat introuvable." }, { status: 404 });
    return pdfResponse(pdf.buffer, pdf.filename, "attachment");
  } catch (error) {
    if (error instanceof PermissionError) return Response.json({ error: "Accès refusé." }, { status: 403 });
    console.error("contract.pdf_download_failed", {
      id,
      organizationId: ctx.organizationId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return Response.json({ error: "Le PDF n’a pas pu être généré." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
