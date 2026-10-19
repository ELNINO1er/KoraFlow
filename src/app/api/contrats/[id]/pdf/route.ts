import { requireAuthContext } from "@/server/auth/context";
import { generateContractPdf } from "@/server/services/contract-pdf";
import { getContractById } from "@/server/repositories/contract-repository";
import { getLatestStoredArchive } from "@/server/repositories/document-archive-repository";
import { getPrivateFile } from "@/server/storage/private-storage";
import { pdfResponse } from "@/lib/http/pdf-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAuthContext();
  const { id } = await params;

  // Document finalisé & archivé : servir le FICHIER CONSERVÉ (version de
  // référence figée), pas une régénération. Sinon, régénérer (brouillon, etc.).
  const contract = await getContractById(ctx.organizationId, id);
  if (!contract) return Response.json({ error: "Contrat introuvable." }, { status: 404 });
  if (contract.status === "SIGNED") {
    const archive = await getLatestStoredArchive({
      organizationId: ctx.organizationId,
      documentType: "CONTRACT",
      documentId: id,
    });
    if (archive?.pdfStorageKey) {
      try {
        const bytes = await getPrivateFile(archive.pdfStorageKey);
        return pdfResponse(bytes, `${contract.number}-signe.pdf`, "attachment");
      } catch {
        // Fichier archivé illisible : repli sur la régénération ci-dessous.
      }
    }
  }

  const pdf = await generateContractPdf(ctx, id);
  if (!pdf) return Response.json({ error: "Contrat introuvable." }, { status: 404 });
  return pdfResponse(pdf.buffer, pdf.filename, "attachment");
}
