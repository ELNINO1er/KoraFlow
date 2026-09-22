import { generateQuotePdfByToken } from "@/server/services/quote-pdf";

/** PDF public d'un devis via son jeton (portail client, hors authentification). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const pdf = await generateQuotePdfByToken(token);
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
