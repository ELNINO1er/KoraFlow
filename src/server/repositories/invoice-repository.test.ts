import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../database/client";
import * as repo from "./invoice-repository";

const SUFFIX = "iso-test-invoice";
let orgAId = "";
let orgBId = "";
let invoiceBId = "";

beforeAll(async () => {
  const orgA = await prisma.organization.create({ data: { name: "Org A", slug: `i-org-a-${SUFFIX}` } });
  const orgB = await prisma.organization.create({ data: { name: "Org B", slug: `i-org-b-${SUFFIX}` } });
  orgAId = orgA.id;
  orgBId = orgB.id;

  const contactA = await prisma.contact.create({ data: { organizationId: orgAId, firstName: "Client A" } });
  const contactB = await prisma.contact.create({ data: { organizationId: orgBId, firstName: "Client B" } });

  await repo.createInvoice(orgAId, {
    contactId: contactA.id,
    currency: "XOF",
    items: [{ description: "Ligne A", unitPriceMinor: 100000, quantity: 1, taxRate: 18 }],
  });
  const invB = await repo.createInvoice(orgBId, {
    contactId: contactB.id,
    currency: "XOF",
    items: [{ description: "Ligne B", unitPriceMinor: 50000, quantity: 2, taxRate: 18 }],
  });
  invoiceBId = invB.id;
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
  await prisma.$disconnect();
});

describe("isolation multi-tenant des factures", () => {
  it("totaux figés + numéro FAC", async () => {
    const inv = await repo.getInvoiceById(orgBId, invoiceBId);
    expect(inv?.totalMinor).toBe(118000); // 100000 HT + 18% TVA
    expect(inv?.number).toMatch(/^FAC-\d{4}-0001$/);
    expect(inv?.paidMinor).toBe(0);
  });

  it("listInvoices(A) ne renvoie que les factures de A", async () => {
    const { items, total } = await repo.listInvoices(orgAId);
    expect(total).toBe(1);
    expect(items.every((i) => i.id !== invoiceBId)).toBe(true);
  });

  it("getInvoiceById(A, factureDeB) renvoie null", async () => {
    expect(await repo.getInvoiceById(orgAId, invoiceBId)).toBeNull();
  });

  it("updateInvoiceStatus(A, factureDeB) n'affecte rien", async () => {
    expect(await repo.updateInvoiceStatus(orgAId, invoiceBId, "SENT")).toBeNull();
    expect((await repo.getInvoiceById(orgBId, invoiceBId))?.status).toBe("DRAFT");
  });

  it("softDeleteInvoice(A, factureDeB) échoue", async () => {
    expect(await repo.softDeleteInvoice(orgAId, invoiceBId)).toBe(false);
    expect(await repo.getInvoiceById(orgBId, invoiceBId)).not.toBeNull();
  });
});
