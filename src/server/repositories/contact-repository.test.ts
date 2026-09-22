import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../database/client";
import * as repo from "./contact-repository";

/**
 * TEST D'ISOLATION MULTI-TENANT (intégration, base réelle).
 *
 * Vérifie qu'un accès scopé à l'organisation A ne peut JAMAIS lire ni modifier
 * les données de l'organisation B. Ce test doit rester ROUGE si l'isolation par
 * `organizationId` était retirée de la couche repository.
 *
 * Prérequis : PostgreSQL de dev démarré (docker compose up -d).
 */

const SUFFIX = "iso-test-crm";
let orgAId = "";
let orgBId = "";
let contactAId = "";
let contactBId = "";

beforeAll(async () => {
  const orgA = await prisma.organization.create({
    data: { name: "Org A", slug: `org-a-${SUFFIX}` },
  });
  const orgB = await prisma.organization.create({
    data: { name: "Org B", slug: `org-b-${SUFFIX}` },
  });
  orgAId = orgA.id;
  orgBId = orgB.id;

  const contactA = await repo.createContact(orgAId, {
    firstName: "Awa",
    lastName: "Konaté",
    email: "awa@org-a.test",
  });
  const contactB = await repo.createContact(orgBId, {
    firstName: "Kofi",
    lastName: "Mensah",
    email: "kofi@org-b.test",
  });
  contactAId = contactA.id;
  contactBId = contactB.id;
});

afterAll(async () => {
  // La suppression des organisations retire les contacts en cascade.
  await prisma.organization.deleteMany({
    where: { id: { in: [orgAId, orgBId] } },
  });
  await prisma.$disconnect();
});

describe("isolation multi-tenant des contacts", () => {
  it("listContacts(A) ne renvoie que les contacts de A", async () => {
    const { items, total } = await repo.listContacts(orgAId);
    expect(total).toBe(1);
    expect(items.map((c) => c.id)).toEqual([contactAId]);
    expect(items.map((c) => c.id)).not.toContain(contactBId);
  });

  it("getContactById(A, contactDeB) renvoie null (lecture inter-org bloquée)", async () => {
    const leaked = await repo.getContactById(orgAId, contactBId);
    expect(leaked).toBeNull();
  });

  it("updateContact(A, contactDeB) n'affecte rien et laisse B intact", async () => {
    const result = await repo.updateContact(orgAId, contactBId, {
      firstName: "PIRATÉ",
    });
    expect(result).toBeNull();

    const stillB = await repo.getContactById(orgBId, contactBId);
    expect(stillB?.firstName).toBe("Kofi");
  });

  it("softDeleteContact(A, contactDeB) échoue et B reste présent", async () => {
    const deleted = await repo.softDeleteContact(orgAId, contactBId);
    expect(deleted).toBe(false);

    const stillThere = await repo.getContactById(orgBId, contactBId);
    expect(stillThere).not.toBeNull();
  });

  it("chaque organisation accède bien à SON contact", async () => {
    expect((await repo.getContactById(orgAId, contactAId))?.id).toBe(contactAId);
    expect((await repo.getContactById(orgBId, contactBId))?.id).toBe(contactBId);
  });
});
