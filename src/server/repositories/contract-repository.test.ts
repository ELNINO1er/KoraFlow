import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../database/client";
import * as repo from "./contract-repository";

/**
 * TEST D'ISOLATION MULTI-TENANT (intégration, base réelle) pour les contrats.
 * Prérequis : PostgreSQL de dev démarré.
 */

const SUFFIX = "iso-test-contract";
let orgAId = "";
let orgBId = "";
let contractBId = "";

beforeAll(async () => {
  const orgA = await prisma.organization.create({
    data: { name: "Org A", slug: `c-org-a-${SUFFIX}` },
  });
  const orgB = await prisma.organization.create({
    data: { name: "Org B", slug: `c-org-b-${SUFFIX}` },
  });
  orgAId = orgA.id;
  orgBId = orgB.id;

  const contactA = await prisma.contact.create({
    data: { organizationId: orgAId, firstName: "Client A" },
  });
  const contactB = await prisma.contact.create({
    data: { organizationId: orgBId, firstName: "Client B" },
  });

  await repo.createContract(orgAId, {
    contactId: contactA.id,
    title: "Contrat A",
    content: "Contenu A",
  });
  const contractB = await repo.createContract(orgBId, {
    contactId: contactB.id,
    title: "Contrat B",
    content: "Contenu B",
  });
  contractBId = contractB.id;
});

afterAll(async () => {
  await prisma.organization.deleteMany({
    where: { id: { in: [orgAId, orgBId] } },
  });
  await prisma.$disconnect();
});

describe("isolation multi-tenant des contrats", () => {
  it("génère un numéro et un jeton public, avec un événement initial", async () => {
    const c = await repo.getContractById(orgBId, contractBId);
    expect(c?.number).toMatch(/^CTR-\d{4}-0001$/);
    const full = await prisma.contract.findUnique({ where: { id: contractBId } });
    expect(full?.publicToken).toBeTruthy();
    expect(c?.events.length).toBeGreaterThanOrEqual(1);
  });

  it("listContracts(A) ne renvoie que les contrats de A", async () => {
    const { items, total } = await repo.listContracts(orgAId);
    expect(total).toBe(1);
    expect(items.every((c) => c.id !== contractBId)).toBe(true);
  });

  it("getContractById(A, contratDeB) renvoie null", async () => {
    expect(await repo.getContractById(orgAId, contractBId)).toBeNull();
  });

  it("updateContractStatus(A, contratDeB) n'affecte rien", async () => {
    expect(await repo.updateContractStatus(orgAId, contractBId, "SENT")).toBeNull();
    const stillB = await repo.getContractById(orgBId, contractBId);
    expect(stillB?.status).toBe("DRAFT");
  });

  it("softDeleteContract(A, contratDeB) échoue", async () => {
    expect(await repo.softDeleteContract(orgAId, contractBId)).toBe(false);
    expect(await repo.getContractById(orgBId, contractBId)).not.toBeNull();
  });
});
