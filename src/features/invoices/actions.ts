"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { InvoiceStatus } from "@prisma/client";
import { resolveSession, type AuthContext } from "@/server/auth/context";
import * as invoiceService from "@/server/services/invoice-service";
import { InvoiceError } from "@/server/services/invoice-service";
import { generateInvoicePdf } from "@/server/services/invoice-pdf";
import { sendEmail } from "@/server/integrations/email/mailer";
import { PermissionError } from "@/server/permissions/permissions";

async function getContext(): Promise<AuthContext> {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
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
  const pdf = await generateInvoicePdf(ctx, id);
  if (!pdf) return { ok: false, error: "Facture introuvable." };
  if (!pdf.contactEmail) return { ok: false, error: "Le client n'a pas d'adresse e-mail." };

  const appUrl = process.env.APP_URL ?? "";
  const portalLink = pdf.publicToken ? `${appUrl}/i/${pdf.publicToken}` : null;

  try {
    await sendEmail({
      to: pdf.contactEmail,
      subject: `Votre facture ${pdf.number}`,
      html: `<p>Bonjour,</p>
<p>Veuillez trouver ci-joint votre facture <strong>${pdf.number}</strong>.</p>
${portalLink ? `<p>Consultez-la et déclarez votre paiement en ligne : <a href="${portalLink}">${portalLink}</a></p>` : ""}
<p>Cordialement,<br/>${ctx.organization.name}</p>`,
      text: `Votre facture ${pdf.number} est en pièce jointe.${portalLink ? ` En ligne : ${portalLink}` : ""}`,
      attachments: [{ filename: pdf.filename, content: pdf.buffer, contentType: "application/pdf" }],
    });
    await invoiceService.changeInvoiceStatus(ctx, id, "SENT");
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    throw e;
  }

  revalidatePath(`/factures/${id}`);
  revalidatePath("/factures");
  return { ok: true };
}

export async function changeInvoiceStatusAction(id: string, status: InvoiceStatus) {
  const ctx = await getContext();
  try {
    await invoiceService.changeInvoiceStatus(ctx, id, status);
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath(`/factures/${id}`);
  revalidatePath("/factures");
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
