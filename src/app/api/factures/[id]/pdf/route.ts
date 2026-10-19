import { resolveSession } from "@/server/auth/context";
import { generateInvoicePdf } from "@/server/services/invoice-pdf";
import { getStoredArchivePdf } from "@/server/services/document-archive-service";
import { pdfResponse } from "@/lib/http/pdf-response";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await resolveSession();
  if (session.status !== "ok") return new Response("Non autorisé", { status: 401 });
  const { id } = await params;
  // Document finalisé & archivé : servir le fichier conservé (non régénéré).
  const archived = await getStoredArchivePdf(session.context.organizationId, "INVOICE", id);
  if (archived) return pdfResponse(archived, `${id}.pdf`);
  const pdf = await generateInvoicePdf(session.context, id);
  if (!pdf) return new Response("Facture introuvable", { status: 404 });
  return pdfResponse(pdf.buffer, pdf.filename);
}
