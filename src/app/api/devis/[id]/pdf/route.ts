import { resolveSession } from "@/server/auth/context";
import { generateQuotePdf } from "@/server/services/quote-pdf";

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

  return new Response(new Uint8Array(pdf.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
