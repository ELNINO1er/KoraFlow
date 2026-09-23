import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../database/client";
import * as repo from "./payment-repository";
import { createInvoice } from "./invoice-repository";

const SUFFIX = "iso-test-payment";
let orgAId = "";
let orgBId = "";
let paymentBId = "";
let userBId = "";

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
  const paymentB = await repo.createPayment(orgBId, {
    invoiceId: invoiceB.id,
    amountMinor: 100000,
    method: "WAVE",
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
