import { generateInvoicePdfByToken } from "@/server/services/invoice-pdf";
import { getInvoiceByToken } from "@/server/repositories/invoice-repository";
import { getStoredArchivePdf } from "@/server/services/document-archive-service";
import { pdfResponse } from "@/lib/http/pdf-response";
import {
  isValidPublicDocumentToken,
  limitPublicDocumentRequest,
} from "@/lib/security/public-document-access";

/** PDF public d'une facture via son jeton (portail client). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!isValidPublicDocumentToken(token)) {
    return new Response("Facture introuvable", { status: 404 });
  }
  const limited = limitPublicDocumentRequest(request);
  if (limited) return limited;

  // Facture finalisée & archivée : servir le fichier conservé (non régénéré).
  const invoice = await getInvoiceByToken(token);
  if (invoice) {
    const archived = await getStoredArchivePdf(invoice.organizationId, "INVOICE", invoice.id);
    if (archived) return pdfResponse(archived, `${invoice.number}.pdf`);
  }
  const pdf = await generateInvoicePdfByToken(token);
  if (!pdf) return new Response("Facture introuvable", { status: 404 });
  return pdfResponse(pdf.buffer, pdf.filename);
}
