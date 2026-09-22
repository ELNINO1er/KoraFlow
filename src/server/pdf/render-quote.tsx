import "server-only";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuoteDocument, type QuotePdfData } from "./quote-document";

/** Génère le PDF d'un devis et le renvoie sous forme de Buffer (runtime Node). */
export async function renderQuotePdf(data: QuotePdfData): Promise<Buffer> {
  return renderToBuffer(<QuoteDocument data={data} />);
}
