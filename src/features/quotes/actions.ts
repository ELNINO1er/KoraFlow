"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { QuoteStatus } from "@prisma/client";
import { resolveSession, type AuthContext } from "@/server/auth/context";
import * as quoteService from "@/server/services/quote-service";
import { InvalidQuoteError } from "@/server/services/quote-service";
import { PermissionError } from "@/server/permissions/permissions";

async function getContext(): Promise<AuthContext> {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "no-organization") redirect("/create-organization");
  return session.context;
}

const amountKind = z.enum(["PERCENT", "AMOUNT"]).nullable().optional();

const createQuotePayloadSchema = z.object({
  contactId: z.string().min(1, "Sélectionnez un client."),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
  terms: z.string().optional(),
  discountType: amountKind,
  discountValue: z.number().int().min(0).optional(),
  depositType: amountKind,
  depositValue: z.number().int().min(0).optional(),
  items: z
    .array(
      z.object({
        serviceId: z.string().nullable().optional(),
        description: z.string().trim().min(1, "Description requise."),
        unitPriceMinor: z.number().int().min(0),
        quantity: z.number().int().min(1),
        taxRate: z.number().int().min(0).max(100),
      }),
    )
    .min(1, "Ajoutez au moins une ligne."),
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
    if (e instanceof InvalidQuoteError) return { ok: false, error: e.message };
    if (e instanceof PermissionError) {
      return { ok: false, error: "Vous n'avez pas la permission de créer un devis." };
    }
    throw e;
  }
}

export async function changeQuoteStatusAction(id: string, status: QuoteStatus) {
  const ctx = await getContext();
  try {
    await quoteService.changeQuoteStatus(ctx, id, status);
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath("/devis");
  revalidatePath(`/devis/${id}`);
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
