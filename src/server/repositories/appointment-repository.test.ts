import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../database/client";
import * as repo from "./appointment-repository";

const SUFFIX = "iso-test-appt";
let orgAId = "";
let orgBId = "";
let typeBId = "";
let typeBSlug = "";

beforeAll(async () => {
  const orgA = await prisma.organization.create({ data: { name: "Org A", slug: `a-org-a-${SUFFIX}` } });
  const orgB = await prisma.organization.create({ data: { name: "Org B", slug: `a-org-b-${SUFFIX}` } });
  orgAId = orgA.id;
  orgBId = orgB.id;

  await repo.createAppointmentType(orgAId, { name: "Découverte A", slug: `decouverte-a-${SUFFIX}`, durationMinutes: 30 });
  const typeB = await repo.createAppointmentType(orgBId, { name: "Découverte B", slug: `decouverte-b-${SUFFIX}`, durationMinutes: 30 });
  typeBId = typeB.id;
  typeBSlug = typeB.slug;
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
  await prisma.$disconnect();
});

describe("isolation multi-tenant des rendez-vous", () => {
  it("listAppointmentTypes(A) ne renvoie que les types de A", async () => {
    const list = await repo.listAppointmentTypes(orgAId);
    expect(list.length).toBe(1);
    expect(list.every((t) => t.id !== typeBId)).toBe(true);
  });

  it("getAppointmentTypeById(A, typeDeB) renvoie null", async () => {
    expect(await repo.getAppointmentTypeById(orgAId, typeBId)).toBeNull();
  });

  it("setAvailability(A, sur type de B) échoue", async () => {
    const done = await repo.setAvailability(orgAId, typeBId, [{ dayOfWeek: 1, startMinutes: 540, endMinutes: 1020 }]);
    expect(done).toBe(false);
  });

  it("setAvailability(B, sur type de B) réussit", async () => {
    const done = await repo.setAvailability(orgBId, typeBId, [{ dayOfWeek: 1, startMinutes: 540, endMinutes: 1020 }]);
    expect(done).toBe(true);
  });

  it("getAppointmentTypeBySlug est public (accès par slug)", async () => {
    const type = await repo.getAppointmentTypeBySlug(typeBSlug);
    expect(type?.id).toBe(typeBId);
    expect(type?.availabilities.length).toBe(1);
  });
});
