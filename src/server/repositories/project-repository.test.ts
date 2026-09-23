import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../database/client";
import * as repo from "./project-repository";
import { createInvoice } from "./invoice-repository";

const SUFFIX = "iso-test-project";
let orgAId = "";
let orgBId = "";
let projectBId = "";

beforeAll(async () => {
  const orgA = await prisma.organization.create({ data: { name: "Org A", slug: `pr-org-a-${SUFFIX}` } });
  const orgB = await prisma.organization.create({ data: { name: "Org B", slug: `pr-org-b-${SUFFIX}` } });
  orgAId = orgA.id;
  orgBId = orgB.id;

  const contactA = await prisma.contact.create({ data: { organizationId: orgAId, firstName: "Client A" } });
  const contactB = await prisma.contact.create({ data: { organizationId: orgBId, firstName: "Client B" } });

  await repo.createProject(orgAId, { contactId: contactA.id, title: "Projet A" });
  const projB = await repo.createProject(orgBId, { contactId: contactB.id, title: "Projet B" });
  projectBId = projB.id;
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
  await prisma.$disconnect();
});

describe("isolation multi-tenant des projets", () => {
  it("créé avec des étapes par défaut", async () => {
    const p = await repo.getProjectById(orgBId, projectBId);
    expect(p?.stages.length).toBe(3);
    expect(p?.progress).toBe(0);
  });

  it("listProjects(A) ne renvoie que les projets de A", async () => {
    const { items, total } = await repo.listProjects(orgAId);
    expect(total).toBe(1);
    expect(items.every((p) => p.id !== projectBId)).toBe(true);
  });

  it("getProjectById(A, projetDeB) renvoie null", async () => {
    expect(await repo.getProjectById(orgAId, projectBId)).toBeNull();
  });

  it("createTask(A, sur projet de B) échoue", async () => {
    expect(await repo.createTask(orgAId, { projectId: projectBId, title: "X" })).toBeNull();
  });

  it("updateProjectStatus(A, projetDeB) n'affecte rien", async () => {
    expect(await repo.updateProjectStatus(orgAId, projectBId, "COMPLETED")).toBeNull();
    expect((await repo.getProjectById(orgBId, projectBId))?.status).toBe("PLANNED");
  });
});

describe("création automatique d'un projet depuis une facture", () => {
  it("crée le projet une fois puis est idempotent (contrainte invoiceId)", async () => {
    const contact = await prisma.contact.create({ data: { organizationId: orgAId, firstName: "Client Facture" } });
    const invoice = await createInvoice(orgAId, {
      contactId: contact.id,
      currency: "XOF",
      items: [{ description: "Prestation", unitPriceMinor: 100000, quantity: 1, taxRate: 0 }],
    });

    const first = await repo.ensureProjectForInvoice(orgAId, invoice.id);
    expect(first?.created).toBe(true);
    expect(first?.project.invoiceId).toBe(invoice.id);

    // Deuxième appel : aucun nouveau projet (idempotent).
    const second = await repo.ensureProjectForInvoice(orgAId, invoice.id);
    expect(second?.created).toBe(false);
    expect(second?.project.id).toBe(first?.project.id);

    // Le projet porte bien les étapes par défaut.
    const full = await repo.getProjectById(orgAId, first!.project.id);
    expect(full?.stages.length).toBe(3);
  });
});
