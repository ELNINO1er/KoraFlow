"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { QuoteStatus } from "@prisma/client";
import { resolveSession, type AuthContext } from "@/server/auth/context";
import * as quoteService from "@/server/services/quote-service";
import { InvalidQuoteError } from "@/server/services/quote-service";
import { generateQuotePdf } from "@/server/services/quote-pdf";
import { emailDeliveryErrorMessage, sendEmail } from "@/server/integrations/email/mailer";
import { assertCan, PermissionError } from "@/server/permissions/permissions";
import { brandedEmail } from "@/server/integrations/email/template";
import { MoneyBoundsError } from "@/lib/quotes/totals";
import { collectUnsupportedCharacters, unsupportedCharactersMessage } from "@/lib/pdf/winansi";

async function getContext(): Promise<AuthContext> {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "suspended") redirect("/compte-suspendu");
  if (session.status === "no-organization") redirect("/create-organization");
  return session.context;
}

const amountKind = z.enum(["PERCENT", "AMOUNT"]).nullable().optional();

// Bornes alignées sur celles des factures (src/features/invoices/actions.ts)
// pour une validation symétrique devis/factures.
const sectionsSchema = z
  .array(z.object({ heading: z.string().trim().min(1).max(160), body: z.string().trim().min(1).max(8000) }))
  .max(20)
  .optional();

const createQuotePayloadSchema = z.object({
  contactId: z.string().min(1, "Sélectionnez un client."),
  expiryDate: z.string().optional(),
  notes: z.string().max(2000).optional(),
  terms: z.string().max(5000).optional(),
  title: z.string().max(160).optional(),
  introduction: z.string().max(5000).optional(),
  sections: sectionsSchema,
  discountType: amountKind,
  discountValue: z.number().int().min(0).max(100_000_000).optional(),
  depositType: amountKind,
  depositValue: z.number().int().min(0).max(100_000_000).optional(),
  items: z
    .array(
      z.object({
        serviceId: z.string().nullable().optional(),
        description: z.string().trim().min(1, "Description requise.").max(500),
        unitPriceMinor: z.number().int().min(0).max(1_000_000_000),
        quantity: z.number().int().min(1).max(100_000),
        taxRate: z.number().int().min(0).max(100),
      }),
    )
    .min(1, "Ajoutez au moins une ligne.")
    .max(100, "Un devis ne peut pas comporter plus de 100 lignes."),
});

export type CreateQuotePayload = z.infer<typeof createQuotePayloadSchema>;

export interface CreateQuoteResult {
  ok: boolean;
  quoteId?: string;
  error?: string;
}

export async function createQuoteAction(
  payload: CreateQuotePayload,
): Promise<CreateQuoteResult> {
  const ctx = await getContext();
  const parsed = createQuotePayloadSchema.safeParse(payload);
  if (!parsed.success) {
    return {
      ok: false,
      error: parsed.error.issues[0]?.message ?? "Données du devis invalides.",
    };
  }
  const data = parsed.data;

  try {
    const quote = await quoteService.createQuote(ctx, {
      contactId: data.contactId,
      expiryDate:
        data.expiryDate && data.expiryDate !== ""
          ? new Date(data.expiryDate)
          : null,
      notes: data.notes,
      terms: data.terms,
      title: data.title,
      introduction: data.introduction,
      sections: data.sections,
      discountType: data.discountType ?? null,
      discountValue: data.discountValue ?? 0,
      depositType: data.depositType ?? null,
      depositValue: data.depositValue ?? 0,
      items: data.items.map((i) => ({
        serviceId: i.serviceId ?? null,
        description: i.description,
        unitPriceMinor: i.unitPriceMinor,
        quantity: i.quantity,
        taxRate: i.taxRate,
      })),
    });
    revalidatePath("/devis");
    return { ok: true, quoteId: quote.id };
  } catch (e) {
    if (e instanceof MoneyBoundsError) {
      return { ok: false, error: "Les montants du devis sont trop élevés pour être enregistrés." };
    }
    if (e instanceof InvalidQuoteError) return { ok: false, error: e.message };
    if (e instanceof PermissionError) {
      return { ok: false, error: "Vous n'avez pas la permission de créer un devis." };
    }
    throw e;
  }
}

const updateQuotePayloadSchema = createQuotePayloadSchema.omit({ contactId: true });

export async function updateQuoteAction(
  id: string,
  payload: z.input<typeof updateQuotePayloadSchema>,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getContext();
  const parsed = updateQuotePayloadSchema.safeParse(payload);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Données du devis invalides." };
  const data = parsed.data;
  try {
    await quoteService.updateDraftQuote(ctx, id, {
      expiryDate: data.expiryDate && data.expiryDate !== "" ? new Date(data.expiryDate) : null,
      notes: data.notes,
      terms: data.terms,
      title: data.title,
      introduction: data.introduction,
      sections: data.sections,
      discountType: data.discountType ?? null,
      discountValue: data.discountValue ?? 0,
      depositType: data.depositType ?? null,
      depositValue: data.depositValue ?? 0,
      items: data.items.map((i) => ({ serviceId: i.serviceId ?? null, description: i.description, unitPriceMinor: i.unitPriceMinor, quantity: i.quantity, taxRate: i.taxRate })),
    });
  } catch (e) {
    if (e instanceof MoneyBoundsError) return { ok: false, error: "Les montants du devis sont trop élevés pour être enregistrés." };
    if (e instanceof InvalidQuoteError) return { ok: false, error: e.message };
    if (e instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    throw e;
  }
  revalidatePath("/devis");
  revalidatePath(`/devis/${id}`);
  revalidatePath(`/devis/${id}/modifier`);
  return { ok: true };
}

export async function changeQuoteStatusAction(id: string, status: QuoteStatus) {
  const ctx = await getContext();
  try {
    const updated = await quoteService.changeQuoteStatus(ctx, id, status);
    if (!updated) return { ok: false as const, error: "Devis introuvable." };
  } catch (e) {
    if (e instanceof PermissionError) {
      return { ok: false as const, error: "Vous n’avez pas la permission de modifier ce devis." };
    }
    console.error("quote.status_change_failed", { quoteId: id, error: e instanceof Error ? e.message : "unknown" });
    return { ok: false as const, error: "Le statut n’a pas pu être modifié." };
  }
  revalidatePath("/devis");
  revalidatePath(`/devis/${id}`);
  return { ok: true as const };
}

export async function sendQuoteAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getContext();
  const existing = await quoteService.getQuote(ctx, id);
  if (existing) {
    const unsupported = collectUnsupportedCharacters([
      existing.notes,
      existing.terms,
      ...existing.items.map((it) => it.description),
    ]);
    if (unsupported.length) {
      return { ok: false, error: unsupportedCharactersMessage(unsupported) };
    }
  }
  let pdf: NonNullable<Awaited<ReturnType<typeof generateQuotePdf>>>;
  try {
    assertCan(ctx.role, "quotes.update");
    const generated = await generateQuotePdf(ctx, id);
    if (!generated) return { ok: false, error: "Devis introuvable." };
    pdf = generated;
    if (!pdf.contactEmail) {
      return { ok: false, error: "Le client n'a pas d'adresse e-mail renseignée." };
    }
  } catch (e) {
    if (e instanceof PermissionError) {
      return { ok: false, error: "Vous n'avez pas la permission d'envoyer ce devis." };
    }
    console.error("quote.pdf_generation_failed", { quoteId: id, error: e instanceof Error ? e.message : "unknown" });
    return {
      ok: false,
      error: "Le PDF du devis n’a pas pu être généré. Réessayez après avoir vérifié le logo de l’entreprise.",
    };
  }

  try {
    const appUrl = process.env.APP_URL ?? "";
    const portalLink = pdf.publicToken ? `${appUrl}/q/${pdf.publicToken}` : null;

    await sendEmail({
      to: pdf.contactEmail,
      subject: `${pdf.organizationName} — votre devis ${pdf.number}`,
      html: brandedEmail({
        brandName: pdf.organizationName,
        logoUrl: pdf.organizationLogoUrl,
        title: `Votre devis ${pdf.number}`,
        intro: "Bonjour,",
        body: "Votre devis est prêt. Vous le trouverez en pièce jointe et pouvez le consulter, l’accepter ou le refuser depuis votre espace sécurisé.",
        action: portalLink ? { label: "Consulter le devis", url: portalLink } : undefined,
        footer: `Document envoyé par ${pdf.organizationName} avec Alymero.`,
      }),
      text: `Votre devis ${pdf.number} est en pièce jointe.${portalLink ? ` Consultez-le en ligne : ${portalLink}` : ""}`,
      attachments: [
        { filename: pdf.filename, content: pdf.buffer, contentType: "application/pdf" },
      ],
      replyTo: pdf.organizationEmail ?? undefined,
    });
    await quoteService.changeQuoteStatus(ctx, id, "SENT");
  } catch (e) {
    console.error("quote.send_failed", { quoteId: id, error: e instanceof Error ? e.message : "unknown" });
    return {
      ok: false,
      error: emailDeliveryErrorMessage(e),
    };
  }

  revalidatePath(`/devis/${id}`);
  revalidatePath("/devis");
  return { ok: true };
}

export async function deleteQuoteAction(id: string) {
  const ctx = await getContext();
  try {
    await quoteService.deleteQuote(ctx, id);
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath("/devis");
  redirect("/devis");
}
