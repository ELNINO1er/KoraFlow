import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../database/client";
import * as repo from "./form-repository";

const SUFFIX = "iso-test-form";
let orgAId = "";
let orgBId = "";
let formBId = "";
let formBSlug = "";
let fieldBId = "";

beforeAll(async () => {
  const orgA = await prisma.organization.create({ data: { name: "Org A", slug: `f-org-a-${SUFFIX}` } });
  const orgB = await prisma.organization.create({ data: { name: "Org B", slug: `f-org-b-${SUFFIX}` } });
  orgAId = orgA.id;
  orgBId = orgB.id;

  await repo.createForm(orgAId, { name: "Form A", slug: `form-a-${SUFFIX}` });
  const formB = await repo.createForm(orgBId, { name: "Form B", slug: `form-b-${SUFFIX}` });
  formBId = formB.id;
  formBSlug = formB.slug;
  const field = await repo.addField(orgBId, formBId, { label: "E-mail", type: "EMAIL" });
  fieldBId = field!.id;
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
  await prisma.$disconnect();
});

describe("isolation multi-tenant des formulaires", () => {
  it("listForms(A) ne renvoie que les formulaires de A", async () => {
    const list = await repo.listForms(orgAId);
    expect(list.length).toBe(1);
    expect(list.every((f) => f.id !== formBId)).toBe(true);
  });

  it("getFormById(A, formulaireDeB) renvoie null", async () => {
    expect(await repo.getFormById(orgAId, formBId)).toBeNull();
  });

  it("addField(A, sur formulaire de B) échoue", async () => {
    expect(await repo.addField(orgAId, formBId, { label: "X", type: "TEXT" })).toBeNull();
  });

  it("deleteField(A, champ de B) échoue", async () => {
    expect(await repo.deleteField(orgAId, fieldBId)).toBe(false);
  });

  it("getFormBySlug est public (accès par slug, hors organisation)", async () => {
    const form = await repo.getFormBySlug(formBSlug);
    expect(form?.id).toBe(formBId);
    expect(form?.fields.length).toBe(1);
  });
});
