import "server-only";
import type { AuthContext } from "../auth/context";
import { prisma } from "../database/client";
import { getQuote } from "./quote-service";
import { getQuoteByPublicToken } from "../repositories/quote-repository";
import { renderQuotePdf } from "../pdf/render-quote";
import { parseSections } from "@/lib/documents/sections";
import type { QuotePdfData } from "../pdf/render-quote";
import { getPrivateFile } from "../storage/private-storage";
import { organizationLogoContentType } from "@/lib/organizations/logo-validation";
import { formatCurrency } from "@/lib/formatting/currency";
import { parseQuoteDesign } from "@/lib/quotes/design";
import { quoteVariableValues, resolveQuoteVariables } from "@/lib/quotes/variables";

export interface GeneratedQuotePdf {
  buffer: Buffer;
  filename: string;
  number: string;
  contactEmail: string | null;
  publicToken: string | null;
  organizationName: string;
  organizationEmail: string | null;
  organizationLogoUrl: string | null;
}

/**
 * Applique la mise en page du studio et remplace les variables ({client.prenom}…)
 * dans les textes rédactionnels du devis.
 */
function finalizeQuotePdfData(
  data: QuotePdfData,
  quote: {
    design: unknown;
    number: string;
    totalMinor: number;
    currency: string;
    expiryDate: Date | null;
    contact: { firstName: string; lastName: string | null; companyName: string | null };
  },
  organizationName: string,
): QuotePdfData {
  const values = quoteVariableValues({
    contact: quote.contact,
    number: quote.number,
    totalLabel: formatCurrency(quote.totalMinor, quote.currency, data.locale),
    expiryDate: quote.expiryDate,
    organizationName,
    locale: data.locale,
  });
  const resolve = (text: string | null | undefined) => resolveQuoteVariables(text, values);
  return {
    ...data,
    design: parseQuoteDesign(quote.design),
    docSubject: resolve(data.docSubject),
    introduction: resolve(data.introduction),
    notes: resolve(data.notes),
    terms: resolve(data.terms),
    sections: data.sections?.map((sec) => ({ heading: resolve(sec.heading) ?? sec.heading, body: resolve(sec.body) ?? sec.body })) ?? null,
  };
}

async function logoDataUri(storageKey: string | null | undefined) {
  if (!storageKey?.startsWith("organization-logos/")) return null;
  try {
    const bytes = await getPrivateFile(storageKey);
    return `data:${organizationLogoContentType(storageKey)};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
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
      logoUrl: true,
    },
  });

  const localeTag =
    ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const clientName = quote.contact.companyName
    ? quote.contact.companyName
    : `${quote.contact.firstName} ${quote.contact.lastName ?? ""}`.trim();

  const data: QuotePdfData = {
    org: { ...(org ?? { name: ctx.organization.name }), logoDataUri: await logoDataUri(org?.logoUrl) },
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
    terms: quote.terms,
    docSubject: quote.title,
    introduction: quote.introduction,
    sections: parseSections(quote.sections),
  };

  const buffer = await renderQuotePdfWithLogoFallback(finalizeQuotePdfData(data, quote, org?.name ?? ctx.organization.name), quote.id);
  return {
    buffer,
    filename: `${quote.number}.pdf`,
    number: quote.number,
    contactEmail: quote.contact.email,
    publicToken: quote.publicToken,
    organizationName: org?.name ?? ctx.organization.name,
    organizationEmail: org?.email ?? null,
    organizationLogoUrl: org?.logoUrl ? `${process.env.APP_URL ?? ""}/api/organization-logos/${ctx.organizationId}` : null,
  };
}

/** Génère le PDF d'un devis à partir de son jeton public (portail client). */
export async function generateQuotePdfByToken(
  token: string,
): Promise<GeneratedQuotePdf | null> {
  const quote = await getQuoteByPublicToken(token);
  if (!quote) return null;

  const org = quote.organization;
  const localeTag = org.locale === "fr" ? "fr-FR" : org.locale;
  const clientName = quote.contact.companyName
    ? quote.contact.companyName
    : `${quote.contact.firstName} ${quote.contact.lastName ?? ""}`.trim();

  const data: QuotePdfData = {
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
    terms: quote.terms,
    docSubject: quote.title,
    introduction: quote.introduction,
    sections: parseSections(quote.sections),
  };

  const buffer = await renderQuotePdfWithLogoFallback(finalizeQuotePdfData(data, quote, org.name), `public:${token.slice(0, 8)}`);
  return {
    buffer,
    filename: `${quote.number}.pdf`,
    number: quote.number,
    contactEmail: quote.contact.email,
    publicToken: token,
    organizationName: org.name,
    organizationEmail: org.email,
    organizationLogoUrl: org.logoUrl ? `${process.env.APP_URL ?? ""}/api/organization-logos/${org.id}` : null,
  };
}

async function renderQuotePdfWithLogoFallback(data: QuotePdfData, reference: string) {
  try {
    return await renderQuotePdf(data);
  } catch (error) {
    if (!data.org.logoDataUri) throw error;
    console.warn("quote.pdf_logo_ignored", {
      reference,
      error: error instanceof Error ? error.message : "unknown",
    });
    return renderQuotePdf({ ...data, org: { ...data.org, logoDataUri: null } });
  }
}
