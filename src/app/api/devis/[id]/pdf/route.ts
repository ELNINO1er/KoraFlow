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
  try {
    const pdf = await generateQuotePdf(session.context, id);
    if (!pdf) return Response.json({ error: "Devis introuvable" }, { status: 404 });
    return pdfResponse(pdf.buffer, pdf.filename);
  } catch (error) {
    console.error("quote.pdf_download_failed", {
      quoteId: id,
      organizationId: session.context.organizationId,
      error: error instanceof Error ? error.message : "unknown",
    });
    return Response.json(
      { error: "Le PDF n’a pas pu être généré." },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }
}
