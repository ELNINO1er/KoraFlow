import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../database/client";
import * as repo from "./quote-repository";

/**
 * TEST D'ISOLATION MULTI-TENANT (intégration, base réelle) pour les devis.
 * Prérequis : PostgreSQL de dev démarré.
 */

const SUFFIX = "iso-test-quote";
let orgAId = "";
let orgBId = "";
let quoteBId = "";

beforeAll(async () => {
  const orgA = await prisma.organization.create({
    data: { name: "Org A", slug: `q-org-a-${SUFFIX}` },
  });
  const orgB = await prisma.organization.create({
    data: { name: "Org B", slug: `q-org-b-${SUFFIX}` },
  });
  orgAId = orgA.id;
  orgBId = orgB.id;

  const contactA = await prisma.contact.create({
    data: { organizationId: orgAId, firstName: "Client A" },
  });
  const contactB = await prisma.contact.create({
    data: { organizationId: orgBId, firstName: "Client B" },
  });

  await repo.createQuote(orgAId, {
    contactId: contactA.id,
    currency: "XOF",
    items: [{ description: "Ligne A", unitPriceMinor: 100000, quantity: 1, taxRate: 18 }],
  });
  const quoteB = await repo.createQuote(orgBId, {
    contactId: contactB.id,
    currency: "XOF",
    items: [{ description: "Ligne B", unitPriceMinor: 50000, quantity: 2, taxRate: 18 }],
  });
  quoteBId = quoteB.id;
});

afterAll(async () => {
  await prisma.organization.deleteMany({
    where: { id: { in: [orgAId, orgBId] } },
  });
  await prisma.$disconnect();
});

describe("isolation multi-tenant des devis", () => {
  it("les totaux sont figés correctement à la création", async () => {
    const quote = await repo.getQuoteById(orgBId, quoteBId);
    // 50000 × 2 = 100000 HT ; TVA 18 % = 18000 ; TTC = 118000
    expect(quote?.subtotalMinor).toBe(100000);
    expect(quote?.taxMinor).toBe(18000);
    expect(quote?.totalMinor).toBe(118000);
    expect(quote?.number).toMatch(/^DEV-\d{4}-0001$/);
  });

  it("listQuotes(A) ne renvoie que les devis de A", async () => {
    const { items, total } = await repo.listQuotes(orgAId);
    expect(total).toBe(1);
    expect(items.every((q) => q.id !== quoteBId)).toBe(true);
  });

  it("getQuoteById(A, devisDeB) renvoie null", async () => {
    expect(await repo.getQuoteById(orgAId, quoteBId)).toBeNull();
  });

  it("updateQuoteStatus(A, devisDeB) n'affecte rien", async () => {
    expect(await repo.updateQuoteStatus(orgAId, quoteBId, "SENT")).toBeNull();
    const stillB = await repo.getQuoteById(orgBId, quoteBId);
    expect(stillB?.status).toBe("DRAFT");
  });

  it("softDeleteQuote(A, devisDeB) échoue", async () => {
    expect(await repo.softDeleteQuote(orgAId, quoteBId)).toBe(false);
    expect(await repo.getQuoteById(orgBId, quoteBId)).not.toBeNull();
  });
});
