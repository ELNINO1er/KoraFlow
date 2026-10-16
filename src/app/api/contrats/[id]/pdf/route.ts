import { requireAuthContext } from "@/server/auth/context";
import { generateContractPdf } from "@/server/services/contract-pdf";
import { pdfResponse } from "@/lib/http/pdf-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireAuthContext();
  const { id } = await params;
  const pdf = await generateContractPdf(ctx, id);
  if (!pdf) return Response.json({ error: "Contrat introuvable." }, { status: 404 });
  return pdfResponse(pdf.buffer, pdf.filename, "attachment");
}
