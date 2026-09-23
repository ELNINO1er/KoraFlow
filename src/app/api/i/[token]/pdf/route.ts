import { generateInvoicePdfByToken } from "@/server/services/invoice-pdf";

/** PDF public d'une facture via son jeton (portail client). */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const pdf = await generateInvoicePdfByToken(token);
  if (!pdf) return new Response("Facture introuvable", { status: 404 });
  return new Response(new Uint8Array(pdf.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
