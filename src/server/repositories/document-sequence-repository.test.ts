import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { prisma } from "../database/client";
import { nextDocumentSequence } from "./document-sequence-repository";

const SLUG = "sequence-concurrency-test";
let organizationId = "";

beforeAll(async () => {
  await prisma.organization.deleteMany({ where: { slug: SLUG } });
  const organization = await prisma.organization.create({
    data: { name: "Organisation séquences", slug: SLUG },
  });
  organizationId = organization.id;
});

afterAll(async () => {
  if (organizationId) {
    await prisma.organization.deleteMany({ where: { id: organizationId } });
  }
  await prisma.$disconnect();
});

describe("numérotation atomique des documents", () => {
  it("attribue une valeur unique à chaque création concurrente", async () => {
    const values = await Promise.all(
      Array.from({ length: 10 }, () =>
        prisma.$transaction((tx) =>
          nextDocumentSequence(tx, organizationId, "QUOTE", 2030),
        ),
      ),
    );

    expect([...values].sort((a, b) => a - b)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  });
});
