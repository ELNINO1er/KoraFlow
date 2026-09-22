import { resolveSession } from "@/server/auth/context";
import { generateInvoicePdf } from "@/server/services/invoice-pdf";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await resolveSession();
  if (session.status !== "ok") return new Response("Non autorisé", { status: 401 });
  const { id } = await params;
  const pdf = await generateInvoicePdf(session.context, id);
  if (!pdf) return new Response("Facture introuvable", { status: 404 });
  return new Response(new Uint8Array(pdf.buffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="${pdf.filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
