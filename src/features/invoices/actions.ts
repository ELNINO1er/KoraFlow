"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { InvoiceStatus } from "@prisma/client";
import { z } from "zod";
import { resolveSession, type AuthContext } from "@/server/auth/context";
import * as invoiceService from "@/server/services/invoice-service";
import { InvoiceError } from "@/server/services/invoice-service";
import { generateInvoicePdf } from "@/server/services/invoice-pdf";
import { sendEmail, emailDeliveryErrorMessage } from "@/server/integrations/email/mailer";
import { brandedEmail } from "@/server/integrations/email/template";
import { PermissionError } from "@/server/permissions/permissions";
import { MoneyBoundsError } from "@/lib/quotes/totals";
import { collectUnsupportedCharacters, unsupportedCharactersMessage } from "@/lib/pdf/winansi";
import { archiveDocument, snapshotFingerprint } from "@/server/services/document-archive-service";

const colorSchema = z.string().regex(/^#[0-9a-fA-F]{6}$/).nullable().optional();
const updateInvoiceSchema = z.object({
  dueDate: z.string().date().nullable().optional(),
  notes: z.string().max(2000).nullable().optional(),
  headerColor: colorSchema,
  footerColor: colorSchema,
  footerText: z.string().max(240).nullable().optional(),
  discountType: z.enum(["PERCENT", "AMOUNT"]).nullable().optional(),
  discountValue: z.number().int().min(0).max(100_000_000),
  depositType: z.enum(["PERCENT", "AMOUNT"]).nullable().optional(),
  depositValue: z.number().int().min(0).max(100_000_000),
  items: z.array(z.object({
    serviceId: z.string().nullable().optional(),
    description: z.string().trim().min(1).max(500),
    unitPriceMinor: z.number().int().min(0).max(1_000_000_000),
    quantity: z.number().int().min(1).max(100_000),
    taxRate: z.number().int().min(0).max(100),
  })).min(1).max(100),
});

async function getContext(): Promise<AuthContext> {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "suspended") redirect("/compte-suspendu");
  if (session.status === "no-organization") redirect("/create-organization");
  return session.context;
}

export async function generateInvoiceAction(
  quoteId: string,
): Promise<{ ok: boolean; invoiceId?: string; error?: string }> {
  const ctx = await getContext();
  try {
    const invoice = await invoiceService.generateFromQuote(ctx, quoteId);
    revalidatePath("/factures");
    return { ok: true, invoiceId: invoice.id };
  } catch (e) {
    if (e instanceof MoneyBoundsError) {
      return { ok: false, error: "Les montants de la facture sont trop élevés pour être enregistrés." };
    }
    if (e instanceof InvoiceError) return { ok: false, error: e.message };
    if (e instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    throw e;
  }
}

export async function updateInvoiceAction(
  id: string,
  input: z.input<typeof updateInvoiceSchema>,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getContext();
  const parsed = updateInvoiceSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Vérifiez les lignes et les options de la facture." };
  try {
    await invoiceService.updateDraftInvoice(ctx, id, {
      ...parsed.data,
      dueDate: parsed.data.dueDate ? new Date(`${parsed.data.dueDate}T12:00:00Z`) : null,
    });
  } catch (error) {
    if (error instanceof MoneyBoundsError) {
      return { ok: false, error: "Les montants de la facture sont trop élevés pour être enregistrés." };
    }
    if (error instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    if (error instanceof InvoiceError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath(`/factures/${id}`);
  revalidatePath(`/factures/${id}/modifier`);
  revalidatePath("/factures");
  return { ok: true };
}

export async function reopenInvoiceAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getContext();
  try {
    await invoiceService.reopenInvoiceForCorrection(ctx, id);
  } catch (error) {
    if (error instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    if (error instanceof InvoiceError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath(`/factures/${id}`);
  revalidatePath("/factures");
  return { ok: true };
}

export async function sendInvoiceAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getContext();
  const invoice = await invoiceService.getInvoice(ctx, id);
  if (!invoice) return { ok: false, error: "Facture introuvable." };
  if (invoice.status === "CANCELED") {
    return { ok: false, error: "Une facture annulée ne peut pas être envoyée." };
  }
  const unsupported = collectUnsupportedCharacters([
    invoice.notes,
    invoice.footerText,
    ...invoice.items.map((it) => it.description),
  ]);
  if (unsupported.length) {
    return { ok: false, error: unsupportedCharactersMessage(unsupported) };
  }
  const pdf = await generateInvoicePdf(ctx, id);
  if (!pdf) return { ok: false, error: "Facture introuvable." };
  if (!pdf.contactEmail) return { ok: false, error: "Le client n'a pas d'adresse e-mail." };

  const appUrl = process.env.APP_URL ?? "";
  if (pdf.publicToken && !appUrl) {
    return { ok: false, error: "L’adresse publique de l’application n’est pas configurée." };
  }
  const portalLink = pdf.publicToken ? `${appUrl}/i/${pdf.publicToken}` : null;

  try {
    await sendEmail({
      to: pdf.contactEmail,
      subject: `Votre facture ${pdf.number}`,
      html: brandedEmail({
        title: `Votre facture ${pdf.number}`,
        intro: `Bonjour ${invoice.contact.firstName},`,
        body: `Votre facture est disponible en pièce jointe. Consultez-la${portalLink ? " et déclarez votre paiement depuis votre espace sécurisé" : ""}.`,
        action: portalLink ? { label: "Consulter la facture", url: portalLink } : undefined,
        brandName: ctx.organization.name,
        logoUrl: ctx.organization.logoUrl ? `${appUrl}/api/organization-logos/${ctx.organizationId}` : null,
      }),
      text: `Votre facture ${pdf.number} est en pièce jointe.${portalLink ? ` En ligne : ${portalLink}` : ""}`,
      attachments: [{ filename: pdf.filename, content: pdf.buffer, contentType: "application/pdf" }],
    });
    if (invoice.status === "DRAFT") {
      await invoiceService.changeInvoiceStatus(ctx, id, "SENT");
    }
    // Conservation : à l'ÉMISSION, archive le PDF de la facture (version figée).
    // Non bloquant. Une facture corrigée puis renvoyée produit une nouvelle
    // version (empreinte différente) sans écraser la précédente.
    try {
      const snapshot = {
        number: invoice.number,
        clientName: invoice.contact.companyName || `${invoice.contact.firstName} ${invoice.contact.lastName ?? ""}`.trim(),
        currency: invoice.currency,
        subtotalMinor: invoice.subtotalMinor,
        discountMinor: invoice.discountMinor,
        taxMinor: invoice.taxMinor,
        totalMinor: invoice.totalMinor,
        depositMinor: invoice.depositMinor,
        dueDate: invoice.dueDate?.toISOString() ?? null,
        notes: invoice.notes ?? null,
      };
      await archiveDocument({
        organizationId: ctx.organizationId,
        documentType: "INVOICE",
        documentId: invoice.id,
        reason: "SENT",
        contentHash: snapshotFingerprint(snapshot),
        snapshot,
        pdf: pdf.buffer,
      });
    } catch (error) {
      console.warn("invoice.archive_failed", { invoiceId: id, error: error instanceof Error ? error.message : "unknown" });
    }
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    if (e instanceof InvoiceError) return { ok: false, error: e.message };
    return { ok: false, error: emailDeliveryErrorMessage(e) };
  }

  revalidatePath(`/factures/${id}`);
  revalidatePath("/factures");
  return { ok: true };
}

export async function changeInvoiceStatusAction(id: string, status: InvoiceStatus) {
  const ctx = await getContext();
  const parsed = z.enum(["DRAFT", "SENT", "CANCELED"]).safeParse(status);
  if (!parsed.success) return { ok: false, error: "Statut de facture invalide." };
  try {
    await invoiceService.changeInvoiceStatus(ctx, id, parsed.data);
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    if (e instanceof InvoiceError) return { ok: false, error: e.message };
    throw e;
  }
  revalidatePath(`/factures/${id}`);
  revalidatePath("/factures");
  return { ok: true };
}

export async function deleteInvoiceAction(id: string) {
  const ctx = await getContext();
  try {
    await invoiceService.deleteInvoice(ctx, id);
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath("/factures");
  redirect("/factures");
}
