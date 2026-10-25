import "server-only";
import type { AuthContext } from "@/server/auth/context";
import { prisma } from "@/server/database/client";
import { listContacts } from "@/server/services/contact-service";
import { listServices } from "@/server/services/catalog-service";
import { getQuote } from "@/server/services/quote-service";
import { minorUnitsFor } from "@/lib/formatting/currency";
import { parseSections } from "@/lib/documents/sections";
import { DEFAULT_QUOTE_DESIGN, parseQuoteDesign } from "@/lib/quotes/design";
import type { StudioContact, StudioDoc, StudioOrganization, StudioQuote, StudioService } from "./types";

/** Données communes au studio de devis : clients, catalogue, identité de l'organisation. */
export async function loadQuoteStudioData(ctx: AuthContext) {
  const [contactsRes, servicesRes, org] = await Promise.all([
    listContacts(ctx, { pageSize: 100 }),
    listServices(ctx, { activeOnly: true, pageSize: 100 }),
    prisma.organization.findUnique({
      where: { id: ctx.organizationId },
      select: { name: true, legalName: true, logoUrl: true, email: true, phone: true, addressLine1: true, city: true, country: true, taxId: true, brandColor: true },
    }),
  ]);

  const contacts: StudioContact[] = contactsRes.items.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    companyName: c.companyName,
    email: c.email,
    phone: c.phone,
  }));
  const services: StudioService[] = servicesRes.items.map((s) => ({
    id: s.id,
    name: s.name,
    description: s.description,
    priceMinor: s.priceMinor,
    taxRate: s.taxRate,
    unit: s.unit,
  }));
  const organization: StudioOrganization = {
    id: ctx.organizationId,
    name: org?.name ?? ctx.organization.name,
    legalName: org?.legalName ?? null,
    hasLogo: Boolean(org?.logoUrl),
    email: org?.email ?? null,
    phone: org?.phone ?? null,
    addressLine1: org?.addressLine1 ?? null,
    city: org?.city ?? null,
    country: org?.country ?? null,
    taxId: org?.taxId ?? null,
  };

  return {
    contacts,
    services,
    organization,
    brandColor: org?.brandColor ?? null,
    currency: ctx.organization.currency,
    localeTag: ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale,
    minorUnits: minorUnitsFor(ctx.organization.currency),
  };
}

/** Date locale au format AAAA-MM-JJ (champ date HTML). */
export function isoDay(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

/**
 * Props du studio pour un devis existant. `null` : introuvable ; `"locked"` :
 * le devis n'est plus un brouillon (seuls les brouillons sont modifiables).
 */
export async function loadExistingQuoteStudio(ctx: AuthContext, id: string) {
  const quote = await getQuote(ctx, id);
  if (!quote) return null;
  if (quote.status !== "DRAFT") return "locked" as const;

  const data = await loadQuoteStudioData(ctx);
  // Le client du devis doit rester affichable même s'il n'est pas dans la première page de contacts.
  const contacts: StudioContact[] = data.contacts.some((c) => c.id === quote.contactId)
    ? data.contacts
    : [
        {
          id: quote.contact.id,
          firstName: quote.contact.firstName,
          lastName: quote.contact.lastName,
          companyName: quote.contact.companyName,
          email: quote.contact.email,
          phone: null,
        },
        ...data.contacts,
      ];

  const initialDoc: StudioDoc = {
    contactId: quote.contactId,
    title: quote.title ?? "",
    introduction: quote.introduction ?? "",
    sections: parseSections(quote.sections).map((s, i) => ({ key: i + 1, heading: s.heading, body: s.body })),
    lines: quote.items.map((it, i) => {
      // Description stockée : intitulé sur la 1re ligne, détail éventuel ensuite.
      const [label = "", ...rest] = it.description.split("\n");
      return {
        key: 1000 + i,
        serviceId: it.serviceId,
        label,
        detail: rest.join(" "),
        quantity: it.quantity,
        unitPriceMajor: it.unitPriceMinor / 10 ** data.minorUnits,
        taxRate: it.taxRate,
      };
    }),
    notes: quote.notes ?? "",
    terms: quote.terms ?? "",
    expiryDate: quote.expiryDate ? isoDay(quote.expiryDate) : "",
    discountType: quote.discountType,
    discountValue: quote.discountValue,
    depositType: quote.depositType,
    depositValue: quote.depositValue,
    design: parseQuoteDesign(quote.design) ?? DEFAULT_QUOTE_DESIGN,
  };
  const studioQuote: StudioQuote = { id: quote.id, number: quote.number };

  return {
    quote: studioQuote,
    issueDateIso: isoDay(quote.issueDate),
    initialDoc,
    contacts,
    services: data.services,
    organization: data.organization,
    currency: quote.currency,
    localeTag: data.localeTag,
    minorUnits: data.minorUnits,
  };
}
