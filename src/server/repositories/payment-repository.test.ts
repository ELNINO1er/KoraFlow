import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../database/client";
import * as repo from "./payment-repository";
import { createInvoice } from "./invoice-repository";

const SUFFIX = "iso-test-payment";
let orgAId = "";
let orgBId = "";
let paymentBId = "";
let userBId = "";
let invoiceBId = "";

beforeAll(async () => {
  const orgA = await prisma.organization.create({ data: { name: "Org A", slug: `p-org-a-${SUFFIX}` } });
  const orgB = await prisma.organization.create({ data: { name: "Org B", slug: `p-org-b-${SUFFIX}` } });
  orgAId = orgA.id;
  orgBId = orgB.id;
  const userB = await prisma.user.create({ data: { email: `ub-${SUFFIX}@test.local`, name: "U B" } });
  userBId = userB.id;

  const contactB = await prisma.contact.create({ data: { organizationId: orgBId, firstName: "Client B" } });
  const invoiceB = await createInvoice(orgBId, {
    contactId: contactB.id,
    currency: "XOF",
    items: [{ description: "Ligne B", unitPriceMinor: 100000, quantity: 1, taxRate: 0 }],
  });
  invoiceBId = invoiceB.id;
  const paymentB = await repo.createPayment(orgBId, {
    invoiceId: invoiceB.id,
    amountMinor: 100000,
    method: "WAVE",
    reference: "REF-PAYMENT-B",
    declaredByClient: true,
  });
  paymentBId = paymentB.id;
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
  await prisma.user.deleteMany({ where: { id: userBId } });
  await prisma.$disconnect();
});

describe("isolation multi-tenant des paiements", () => {
  it("refuse de créer un paiement A sur une facture de B", async () => {
    await expect(
      repo.createPayment(orgAId, {
        invoiceId: invoiceBId,
        amountMinor: 1,
        method: "WAVE",
      }),
    ).rejects.toMatchObject({ code: "INVOICE_NOT_FOUND" });
  });

  it("refuse un montant qui dépasse le solde réservé", async () => {
    await expect(
      repo.createPayment(orgBId, {
        invoiceId: invoiceBId,
        amountMinor: 1,
        method: "WAVE",
      }),
    ).rejects.toMatchObject({ code: "AMOUNT_EXCEEDS_BALANCE" });
  });

  it("refuse une référence déjà en attente", async () => {
    await expect(
      repo.createPayment(orgBId, {
        invoiceId: invoiceBId,
        amountMinor: 1,
        method: "WAVE",
        reference: "REF-PAYMENT-B",
      }),
    ).rejects.toMatchObject({ code: "DUPLICATE_REFERENCE" });
  });

  it("getPaymentById(A, paiementDeB) renvoie null", async () => {
    expect(await repo.getPaymentById(orgAId, paymentBId)).toBeNull();
  });

  it("confirmPayment(A, paiementDeB) n'affecte rien", async () => {
    expect(await repo.confirmPayment(orgAId, paymentBId, userBId)).toBe(false);
    expect((await repo.getPaymentById(orgBId, paymentBId))?.status).toBe("PENDING");
  });

  it("rejectPayment(A, paiementDeB) n'affecte rien", async () => {
    expect(await repo.rejectPayment(orgAId, paymentBId)).toBe(false);
  });

  it("confirmPayment(B, paiementDeB) réussit", async () => {
    expect(await repo.confirmPayment(orgBId, paymentBId, userBId)).toBe(true);
    expect((await repo.getPaymentById(orgBId, paymentBId))?.status).toBe("CONFIRMED");
  });
});
