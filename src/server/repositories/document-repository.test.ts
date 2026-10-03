import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../database/client";
import * as repo from "./document-repository";

const SUFFIX = "document-tenant-test";
let orgAId = "";
let orgBId = "";
let projectBId = "";
let documentBId = "";
let userId = "";

beforeAll(async () => {
  const [orgA, orgB, user] = await Promise.all([
    prisma.organization.create({ data: { name: "Documents A", slug: `doc-a-${SUFFIX}` } }),
    prisma.organization.create({ data: { name: "Documents B", slug: `doc-b-${SUFFIX}` } }),
    prisma.user.create({ data: { email: `doc-${SUFFIX}@example.test`, name: "Responsable documents" } }),
  ]);
  orgAId = orgA.id;
  orgBId = orgB.id;
  userId = user.id;
  const contact = await prisma.contact.create({
    data: { organizationId: orgBId, firstName: "Client documents" },
  });
  const project = await prisma.project.create({
    data: { organizationId: orgBId, contactId: contact.id, title: "Projet documents" },
  });
  projectBId = project.id;
  const document = await repo.createDocument(orgBId, {
    projectId: projectBId,
    uploadedById: userId,
    storageKey: `${orgBId}/${projectBId}/test.pdf`,
    originalName: "test.pdf",
    mimeType: "application/pdf",
    sizeBytes: 8,
    sha256: "a".repeat(64),
  });
  documentBId = document!.id;
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
  await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("isolation multi-tenant des documents", () => {
  it("ne liste pas les documents d'une autre organisation", async () => {
    expect(await repo.listProjectDocuments(orgAId, projectBId)).toEqual([]);
  });

  it("ne retrouve pas un document d'une autre organisation", async () => {
    expect(await repo.getDocumentById(orgAId, documentBId)).toBeNull();
  });

  it("refuse de rattacher un document à un projet d'une autre organisation", async () => {
    const result = await repo.createDocument(orgAId, {
      projectId: projectBId,
      uploadedById: userId,
      storageKey: `${orgAId}/${projectBId}/interdit.pdf`,
      originalName: "interdit.pdf",
      mimeType: "application/pdf",
      sizeBytes: 8,
      sha256: "b".repeat(64),
    });
    expect(result).toBeNull();
  });
});
