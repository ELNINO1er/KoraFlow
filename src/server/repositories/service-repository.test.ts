import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../database/client";
import * as repo from "./service-repository";

/**
 * TEST D'ISOLATION MULTI-TENANT (intégration, base réelle) pour le catalogue.
 * Prérequis : PostgreSQL de dev démarré.
 */

const SUFFIX = "iso-test-svc";
let orgAId = "";
let orgBId = "";
let serviceBId = "";

beforeAll(async () => {
  const orgA = await prisma.organization.create({
    data: { name: "Org A", slug: `svc-org-a-${SUFFIX}` },
  });
  const orgB = await prisma.organization.create({
    data: { name: "Org B", slug: `svc-org-b-${SUFFIX}` },
  });
  orgAId = orgA.id;
  orgBId = orgB.id;

  await repo.createService(orgAId, {
    name: "Audit SEO",
    priceMinor: 150000,
    unit: "forfait",
    taxRate: 18,
  });
  const svcB = await repo.createService(orgBId, {
    name: "Design logo",
    priceMinor: 90000,
    unit: "forfait",
    taxRate: 18,
  });
  serviceBId = svcB.id;
});

afterAll(async () => {
  await prisma.organization.deleteMany({
    where: { id: { in: [orgAId, orgBId] } },
  });
  await prisma.$disconnect();
});

describe("isolation multi-tenant des services", () => {
  it("listServices(A) ne renvoie que le catalogue de A", async () => {
    const { items, total } = await repo.listServices(orgAId);
    expect(total).toBe(1);
    expect(items[0]?.name).toBe("Audit SEO");
  });

  it("getServiceById(A, serviceDeB) renvoie null", async () => {
    expect(await repo.getServiceById(orgAId, serviceBId)).toBeNull();
  });

  it("updateService(A, serviceDeB) n'affecte rien", async () => {
    const result = await repo.updateService(orgAId, serviceBId, {
      priceMinor: 1,
    });
    expect(result).toBeNull();
    const stillB = await repo.getServiceById(orgBId, serviceBId);
    expect(stillB?.priceMinor).toBe(90000);
  });

  it("softDeleteService(A, serviceDeB) échoue", async () => {
    expect(await repo.softDeleteService(orgAId, serviceBId)).toBe(false);
    expect(await repo.getServiceById(orgBId, serviceBId)).not.toBeNull();
  });
});
