import { generateContractPdfByToken } from "@/server/services/contract-pdf";
import { pdfResponse } from "@/lib/http/pdf-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const pdf = await generateContractPdfByToken(token);
  if (!pdf) return Response.json({ error: "Contrat introuvable." }, { status: 404 });
  return pdfResponse(pdf.buffer, pdf.filename, "attachment");
}
