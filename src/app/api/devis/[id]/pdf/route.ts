import { resolveSession } from "@/server/auth/context";
import { generateQuotePdf } from "@/server/services/quote-pdf";
import { pdfResponse } from "@/lib/http/pdf-response";

/** Téléchargement du PDF d'un devis (auth + scoping via generateQuotePdf). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await resolveSession();
  if (session.status !== "ok") {
    return new Response("Non autorisé", { status: 401 });
  }

  const { id } = await params;
  const pdf = await generateQuotePdf(session.context, id);
  if (!pdf) {
    return new Response("Devis introuvable", { status: 404 });
  }

  return pdfResponse(pdf.buffer, pdf.filename);
}
