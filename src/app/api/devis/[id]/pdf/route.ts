import { requireAuthContext } from "@/server/auth/context";
import { PermissionError } from "@/server/permissions/permissions";
import { getQuotePdfForDownload } from "@/server/services/document-download";
import { pdfResponse } from "@/lib/http/pdf-response";

/** Téléchargement du PDF d'un devis : droit de lecture vérifié avant tout accès à l'archive. */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAuthContext();
  const { id } = await params;
  try {
    const pdf = await getQuotePdfForDownload(ctx, id);
    if (!pdf) return Response.json({ error: "Devis introuvable." }, { status: 404 });
    return pdfResponse(pdf.buffer, pdf.filename);
  } catch (error) {
    if (error instanceof PermissionError) return Response.json({ error: "Accès refusé." }, { status: 403 });
    console.error("quote.pdf_download_failed", {
      id,
      organizationId: ctx.organizationId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return Response.json({ error: "Le PDF n’a pas pu être généré." }, { status: 500, headers: { "Cache-Control": "no-store" } });
  }
}
