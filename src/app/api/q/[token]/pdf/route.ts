import { generateQuotePdfByToken } from "@/server/services/quote-pdf";
import { pdfResponse } from "@/lib/http/pdf-response";
import {
  isValidPublicDocumentToken,
  limitPublicDocumentRequest,
} from "@/lib/security/public-document-access";

/** PDF public d'un devis via son jeton (portail client, hors authentification). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  if (!isValidPublicDocumentToken(token)) {
    return new Response("Devis introuvable", { status: 404 });
  }
  const limited = limitPublicDocumentRequest(request);
  if (limited) return limited;

  const pdf = await generateQuotePdfByToken(token);
  if (!pdf) {
    return new Response("Devis introuvable", { status: 404 });
  }
  return pdfResponse(pdf.buffer, pdf.filename);
}
