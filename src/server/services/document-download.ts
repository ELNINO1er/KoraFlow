import "server-only";
import type { AuthContext } from "../auth/context";
import { getInvoice } from "./invoice-service";
import { getQuote } from "./quote-service";
import { getContract } from "./contract-service";
import { generateInvoicePdf } from "./invoice-pdf";
import { generateQuotePdf } from "./quote-pdf";
import { generateContractPdf } from "./contract-pdf";
import { getStoredArchivePdf, getStoredVersionPdf, snapshotFingerprint } from "./document-archive-service";

type Invoice = NonNullable<Awaited<ReturnType<typeof getInvoice>>>;
export type DownloadablePdf = { buffer: Buffer; filename: string };

/**
 * Version d'une facture : tout ce qui figure sur le document (lignes, textes,
 * dates, totaux, habillage). Deux contenus différents ont deux empreintes
 * différentes ; le statut de paiement n'en fait pas partie.
 */
export function invoiceVersion(invoice: Invoice) {
  const snapshot = {
    number: invoice.number,
    currency: invoice.currency,
    issueDate: invoice.issueDate.toISOString(),
    dueDate: invoice.dueDate?.toISOString() ?? null,
    client: {
      companyName: invoice.contact.companyName ?? null,
      firstName: invoice.contact.firstName,
      lastName: invoice.contact.lastName ?? null,
    },
    title: invoice.title ?? null,
    introduction: invoice.introduction ?? null,
    sections: invoice.sections ?? null,
    terms: invoice.terms ?? null,
    notes: invoice.notes ?? null,
    footerText: invoice.footerText ?? null,
    headerColor: invoice.headerColor ?? null,
    footerColor: invoice.footerColor ?? null,
    discount: [invoice.discountType ?? null, invoice.discountValue],
    deposit: [invoice.depositType ?? null, invoice.depositValue],
    totals: [invoice.subtotalMinor, invoice.discountMinor, invoice.taxMinor, invoice.totalMinor, invoice.depositMinor],
    items: invoice.items.map((it) => [it.description, it.unitPriceMinor, it.quantity, it.taxRate]),
  };
  return { snapshot, contentHash: snapshotFingerprint(snapshot) };
}

/**
 * PDF d'une facture pour un utilisateur connecté. Le droit de lecture et
 * l'existence sont vérifiés AVANT tout accès à l'archive ; une facture émise est
 * servie depuis l'archive de SA version courante, jamais d'une version antérieure.
 */
export async function getInvoicePdfForDownload(ctx: AuthContext, id: string): Promise<DownloadablePdf | null> {
  const invoice = await getInvoice(ctx, id);
  if (!invoice) return null;
  if (invoice.status !== "DRAFT") {
    const archived = await getStoredVersionPdf(ctx.organizationId, "INVOICE", id, invoiceVersion(invoice).contentHash);
    if (archived) return { buffer: archived, filename: `${invoice.number}.pdf` };
  }
  const pdf = await generateInvoicePdf(ctx, id);
  return pdf ? { buffer: pdf.buffer, filename: pdf.filename } : null;
}

/** PDF d'un devis (droit de lecture vérifié avant l'archive ; un brouillon est toujours régénéré). */
export async function getQuotePdfForDownload(ctx: AuthContext, id: string): Promise<DownloadablePdf | null> {
  const quote = await getQuote(ctx, id);
  if (!quote) return null;
  if (quote.status !== "DRAFT") {
    const archived = await getStoredArchivePdf(ctx.organizationId, "QUOTE", id);
    if (archived) return { buffer: archived, filename: `${quote.number}.pdf` };
  }
  const pdf = await generateQuotePdf(ctx, id);
  return pdf ? { buffer: pdf.buffer, filename: pdf.filename } : null;
}

/** PDF d'un contrat : l'original archivé une fois signé, sinon une génération. */
export async function getContractPdfForDownload(ctx: AuthContext, id: string): Promise<DownloadablePdf | null> {
  const contract = await getContract(ctx, id);
  if (!contract) return null;
  if (contract.status === "SIGNED") {
    const archived = await getStoredArchivePdf(ctx.organizationId, "CONTRACT", id);
    if (archived) return { buffer: archived, filename: `${contract.number}-signe.pdf` };
  }
  const pdf = await generateContractPdf(ctx, id);
  return pdf ? { buffer: pdf.buffer, filename: pdf.filename } : null;
}
