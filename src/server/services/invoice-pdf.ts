import "server-only";
import type { AuthContext } from "../auth/context";
import { prisma } from "../database/client";
import { getInvoice } from "./invoice-service";
import { getInvoiceByToken } from "../repositories/invoice-repository";
import { renderQuotePdf } from "../pdf/render-quote";
import type { QuotePdfData } from "../pdf/render-quote";
import { getPrivateFile } from "../storage/private-storage";
import { organizationLogoContentType } from "@/lib/organizations/logo-validation";
import { isInvoiceOverdue } from "@/lib/constants/invoices";
import { parseSections } from "@/lib/documents/sections";

async function logoDataUri(storageKey: string | null | undefined) {
  if (!storageKey?.startsWith("organization-logos/")) return null;
  try {
    const bytes = await getPrivateFile(storageKey);
    return `data:${organizationLogoContentType(storageKey)};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

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
      addressLine1: true, city: true, country: true, taxId: true, logoUrl: true, brandColor: true,
    },
  });

  const localeTag = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const clientName = invoice.contact.companyName
    ? invoice.contact.companyName
    : `${invoice.contact.firstName} ${invoice.contact.lastName ?? ""}`.trim();

  const data: QuotePdfData = {
    docTitle: "FACTURE",
    org: { ...(org ?? { name: ctx.organization.name }), logoDataUri: await logoDataUri(org?.logoUrl) },
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
    paidMinor: invoice.paidMinor,
    overdue: isInvoiceOverdue(invoice),
    notes: invoice.notes,
    terms: invoice.terms,
    docSubject: invoice.title,
    introduction: invoice.introduction,
    sections: parseSections(invoice.sections),
    headerColor: invoice.headerColor ?? org?.brandColor,
    footerColor: invoice.footerColor ?? org?.brandColor,
    footerText: invoice.footerText,
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

/** PDF de la facture à partir de son jeton public (portail client). */
export async function generateInvoicePdfByToken(
  token: string,
): Promise<GeneratedInvoicePdf | null> {
  const invoice = await getInvoiceByToken(token);
  if (!invoice) return null;

  const org = invoice.organization;
  const localeTag = org.locale === "fr" ? "fr-FR" : org.locale;
  const clientName = invoice.contact.companyName
    ? invoice.contact.companyName
    : `${invoice.contact.firstName} ${invoice.contact.lastName ?? ""}`.trim();

  const data: QuotePdfData = {
    docTitle: "FACTURE",
    org: {
      name: org.name,
      legalName: org.legalName,
      email: org.email,
      phone: org.phone,
      addressLine1: org.addressLine1,
      city: org.city,
      country: org.country,
      taxId: org.taxId,
      logoDataUri: await logoDataUri(org.logoUrl),
    },
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
    paidMinor: invoice.paidMinor,
    overdue: isInvoiceOverdue(invoice),
    notes: invoice.notes,
    terms: invoice.terms,
    docSubject: invoice.title,
    introduction: invoice.introduction,
    sections: parseSections(invoice.sections),
    headerColor: invoice.headerColor,
    footerColor: invoice.footerColor,
    footerText: invoice.footerText,
  };

  const buffer = await renderQuotePdf(data);
  return {
    buffer,
    filename: `${invoice.number}.pdf`,
    number: invoice.number,
    contactEmail: invoice.contact.email,
    publicToken: token,
  };
}
