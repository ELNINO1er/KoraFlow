import { generateQuotePdfByToken } from "@/server/services/quote-pdf";
import { getQuoteByPublicToken } from "@/server/repositories/quote-repository";
import { getStoredArchivePdf } from "@/server/services/document-archive-service";
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

  // Devis finalisé & archivé : servir le fichier conservé (non régénéré).
  const quote = await getQuoteByPublicToken(token);
  if (quote) {
    const archived = await getStoredArchivePdf(quote.organizationId, "QUOTE", quote.id);
    if (archived) return pdfResponse(archived, `${quote.number}.pdf`);
  }
  const pdf = await generateQuotePdfByToken(token);
  if (!pdf) {
    return new Response("Devis introuvable", { status: 404 });
  }
  return pdfResponse(pdf.buffer, pdf.filename);
}
