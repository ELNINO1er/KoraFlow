import "server-only";
import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/server/database/client";

const PRICE = 1_000_000;
const CURRENCY = "XOF";
const API = "https://api.jeko.africa/partner_api/payment_requests";
export const subscriptionMethods = ["wave", "orange", "mtn", "moov", "djamo", "jeko"] as const;
export const subscriptionMethod = z.enum(subscriptionMethods);

export function checkoutConfigured() {
  return Boolean(process.env.JEKO_STORE_ID && process.env.JEKO_API_KEY_ID &&
    process.env.JEKO_API_KEY && process.env.JEKO_WEBHOOK_SECRET && process.env.APP_URL);
}

function apiHeaders() {
  return {
    "Content-Type": "application/json",
    "X-API-KEY-ID": process.env.JEKO_API_KEY_ID!,
    "X-API-KEY": process.env.JEKO_API_KEY!,
  };
}

export async function createSubscriptionCheckout(organizationId: string, method: z.infer<typeof subscriptionMethod>) {
  if (!checkoutConfigured()) throw new Error("Checkout indisponible");
  const storeId = process.env.JEKO_STORE_ID!;
  const existing = await prisma.subscriptionPayment.findUnique({ where: { pendingOrgId: organizationId } });
  if (existing?.providerId) {
    const response = await fetch(`${API}/${encodeURIComponent(existing.providerId)}`, {
      headers: apiHeaders(), cache: "no-store", signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) throw new Error("Statut Jèko indisponible");
    const { status } = z.object({ status: z.enum(["pending", "success", "error"]) }).parse(await response.json());
    if (status === "pending" && existing.checkoutUrl) return existing.checkoutUrl;
    if (status !== "error") throw new Error("Paiement en cours de confirmation");
  } else if (existing && Date.now() - existing.createdAt.getTime() < 60_000) {
    throw new Error("Création du paiement en cours");
  }
  if (existing) {
    await prisma.subscriptionPayment.updateMany({
      where: { reference: existing.reference, pendingOrgId: organizationId },
      data: { pendingOrgId: null },
    });
  }

  const reference = `alymero-sub-${randomUUID()}`;
  const successUrl = new URL("/essai-termine?paiement=confirmation", process.env.APP_URL);
  const errorUrl = new URL("/essai-termine?paiement=echec", process.env.APP_URL);
  await prisma.subscriptionPayment.create({
    data: { reference, organizationId, pendingOrgId: organizationId, storeId },
  });
  const response = await fetch(API, {
    method: "POST",
    headers: apiHeaders(),
    signal: AbortSignal.timeout(8000),
    body: JSON.stringify({
      storeId, reference, amountCents: PRICE, currency: CURRENCY,
      paymentDetails: { type: "redirect", data: {
        paymentMethod: method, successUrl: successUrl.href, errorUrl: errorUrl.href,
      } },
    }),
  });
  if (!response.ok) throw new Error("Demande Jèko refusée");
  const checkout = z.object({
    id: z.string().min(1), redirectUrl: z.url(), storeId: z.literal(storeId), reference: z.literal(reference),
  }).parse(await response.json());
  if (new URL(checkout.redirectUrl).origin !== "https://pay.jeko.africa") {
    throw new Error("Adresse Checkout invalide");
  }
  await prisma.subscriptionPayment.updateMany({
    where: { reference, paidAt: null },
    data: { providerId: checkout.id, checkoutUrl: checkout.redirectUrl },
  });
  return checkout.redirectUrl;
}

export function verifyJekoSignature(body: Buffer, signature: string | null, secret: string) {
  if (!signature || !/^[a-f0-9]{64}$/.test(signature)) return false;
  const expected = createHmac("sha256", secret).update(body).digest();
  return timingSafeEqual(expected, Buffer.from(signature, "hex"));
}

export const jekoTransaction = z.object({
  id: z.string().min(1).max(191),
  status: z.literal("success"),
  transactionType: z.literal("payment"),
  storeId: z.string(),
  amount: z.object({ amount: z.literal(PRICE), currency: z.literal(CURRENCY) }),
  transactionDetails: z.object({
    id: z.string().min(1).max(191),
    reference: z.string().startsWith("alymero-sub-").max(80),
  }),
});

export function addSubscriptionMonth(date: Date) {
  const end = new Date(date);
  const day = end.getUTCDate();
  end.setUTCDate(1);
  end.setUTCMonth(end.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() + 1, 0)).getUTCDate();
  end.setUTCDate(Math.min(day, lastDay));
  return end;
}

export async function confirmSubscription(transaction: z.infer<typeof jekoTransaction>, now = new Date()) {
  const { reference, id: providerId } = transaction.transactionDetails;
  return prisma.$transaction(async (tx) => {
    const payment = await tx.subscriptionPayment.findUnique({ where: { reference } });
    if (!payment || payment.storeId !== transaction.storeId) return;
    // Sérialise les paiements distincts d'une même organisation.
    const [org] = await tx.$queryRaw<{ subscriptionEndsAt: Date | null }[]>`
      SELECT subscriptionEndsAt FROM organization WHERE id = ${payment.organizationId} FOR UPDATE
    `;
    if (!org) return;
    const applied = await tx.subscriptionPayment.updateMany({
      where: {
        reference, paidAt: null,
        OR: [{ providerId }, { providerId: null }],
      },
      data: { paidAt: now, providerId, transactionId: transaction.id, pendingOrgId: null },
    });
    if (applied.count !== 1) return;
    const base = org.subscriptionEndsAt && org.subscriptionEndsAt > now ? org.subscriptionEndsAt : now;
    await tx.organization.update({
      where: { id: payment.organizationId },
      data: { subscriptionEndsAt: addSubscriptionMonth(base) },
    });
  });
}
