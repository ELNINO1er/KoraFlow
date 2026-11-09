import { deleteOrganizations } from "@/server/database/test-cleanup";
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../database/client";
import * as repo from "./appointment-repository";
import { bookAppointment } from "../services/appointment-service";

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
  await deleteOrganizations({ id: { in: [orgAId, orgBId] } });
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

  it("deux réservations simultanées du même créneau : une seule réussit", async () => {
    const day = new Date(Date.now() + 8 * 86_400_000);
    await prisma.availability.create({
      data: { organizationId: orgBId, appointmentTypeId: typeBId, dayOfWeek: day.getUTCDay(), startMinutes: 540, endMinutes: 720 },
    });
    const dateISO = day.toISOString().slice(0, 10);
    const book = (name: string) => bookAppointment(typeBSlug, { dateISO, startMinutes: 540, name, email: `${name}@example.test` });

    const results = await Promise.all([book("premier"), book("second"), book("troisieme")]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    const startAt = new Date(`${dateISO}T09:00:00.000Z`);
    await expect(prisma.appointment.count({ where: { appointmentTypeId: typeBId, startAt } })).resolves.toBe(1);
  });
});
