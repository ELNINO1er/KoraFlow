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
    if (e instanceof InvoiceError) return { ok: false, error: e.message };
    if (e instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    throw e;
  }
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
  const parsed = z.enum(["DRAFT", "SENT", "OVERDUE", "CANCELED"]).safeParse(status);
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
