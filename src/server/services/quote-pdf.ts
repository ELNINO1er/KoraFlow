import "server-only";
import type { AuthContext } from "../auth/context";
import { prisma } from "../database/client";
import { getQuote } from "./quote-service";
import { renderQuotePdf } from "../pdf/render-quote";
import type { QuotePdfData } from "../pdf/quote-document";

export interface GeneratedQuotePdf {
  buffer: Buffer;
  filename: string;
  number: string;
  contactEmail: string | null;
}

/**
 * Génère le PDF d'un devis (scopé via getQuote). Renvoie null si le devis
 * n'existe pas dans l'organisation courante.
 */
export async function generateQuotePdf(
  ctx: AuthContext,
  id: string,
): Promise<GeneratedQuotePdf | null> {
  const quote = await getQuote(ctx, id);
  if (!quote) return null;

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      name: true,
      legalName: true,
      email: true,
      phone: true,
      addressLine1: true,
      city: true,
      country: true,
      taxId: true,
    },
  });

  const localeTag =
    ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const clientName = quote.contact.companyName
    ? quote.contact.companyName
    : `${quote.contact.firstName} ${quote.contact.lastName ?? ""}`.trim();

  const data: QuotePdfData = {
    org: org ?? { name: ctx.organization.name },
    contact: { name: clientName, email: quote.contact.email },
    number: quote.number,
    issueDate: quote.issueDate,
    expiryDate: quote.expiryDate,
    currency: quote.currency,
    locale: localeTag,
    items: quote.items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPriceMinor: it.unitPriceMinor,
      taxRate: it.taxRate,
    })),
    subtotalMinor: quote.subtotalMinor,
    discountMinor: quote.discountMinor,
    taxMinor: quote.taxMinor,
    totalMinor: quote.totalMinor,
    depositMinor: quote.depositMinor,
    notes: quote.notes,
  };

  const buffer = await renderQuotePdf(data);
  return {
    buffer,
    filename: `${quote.number}.pdf`,
    number: quote.number,
    contactEmail: quote.contact.email,
  };
}
