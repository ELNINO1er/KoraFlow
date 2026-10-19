import { generateContractPdfByToken } from "@/server/services/contract-pdf";
import { pdfResponse } from "@/lib/http/pdf-response";
import {
  isValidPublicDocumentToken,
  limitPublicDocumentRequest,
} from "@/lib/security/public-document-access";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  // Validation du format du jeton + limite de génération, à l'identique des
  // routes PDF des devis et factures.
  if (!isValidPublicDocumentToken(token)) {
    return Response.json({ error: "Lien invalide." }, { status: 400 });
  }
  const limited = limitPublicDocumentRequest(request);
  if (limited) return limited;

  const pdf = await generateContractPdfByToken(token);
  if (!pdf) return Response.json({ error: "Contrat introuvable." }, { status: 404 });
  return pdfResponse(pdf.buffer, pdf.filename, "attachment");
}
