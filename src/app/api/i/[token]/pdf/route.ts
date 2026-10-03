import { generateInvoicePdfByToken } from "@/server/services/invoice-pdf";
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

  const pdf = await generateInvoicePdfByToken(token);
  if (!pdf) return new Response("Facture introuvable", { status: 404 });
  return pdfResponse(pdf.buffer, pdf.filename);
}
