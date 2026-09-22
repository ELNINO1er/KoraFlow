import "server-only";
import type { AuthContext } from "../auth/context";
import { prisma } from "../database/client";
import { getInvoice } from "./invoice-service";
import { renderQuotePdf } from "../pdf/render-quote";
import type { QuotePdfData } from "../pdf/quote-document";

export interface GeneratedInvoicePdf {
  buffer: Buffer;
  filename: string;
  number: string;
  contactEmail: string | null;
  publicToken: string | null;
}

export async function generateInvoicePdf(
  ctx: AuthContext,
  id: string,
): Promise<GeneratedInvoicePdf | null> {
  const invoice = await getInvoice(ctx, id);
  if (!invoice) return null;

  const org = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: {
      name: true, legalName: true, email: true, phone: true,
      addressLine1: true, city: true, country: true, taxId: true,
    },
  });

  const localeTag = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const clientName = invoice.contact.companyName
    ? invoice.contact.companyName
    : `${invoice.contact.firstName} ${invoice.contact.lastName ?? ""}`.trim();

  const data: QuotePdfData = {
    docTitle: "FACTURE",
    org: org ?? { name: ctx.organization.name },
    contact: { name: clientName, email: invoice.contact.email },
    number: invoice.number,
    issueDate: invoice.issueDate,
    dueDate: invoice.dueDate,
    currency: invoice.currency,
    locale: localeTag,
    items: invoice.items.map((it) => ({
      description: it.description,
      quantity: it.quantity,
      unitPriceMinor: it.unitPriceMinor,
      taxRate: it.taxRate,
    })),
    subtotalMinor: invoice.subtotalMinor,
    discountMinor: invoice.discountMinor,
    taxMinor: invoice.taxMinor,
    totalMinor: invoice.totalMinor,
    depositMinor: invoice.depositMinor,
    notes: invoice.notes,
  };

  const buffer = await renderQuotePdf(data);
  return {
    buffer,
    filename: `${invoice.number}.pdf`,
    number: invoice.number,
    contactEmail: invoice.contact.email,
    publicToken: invoice.publicToken,
  };
}
