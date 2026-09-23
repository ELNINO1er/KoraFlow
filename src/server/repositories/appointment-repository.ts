import { prisma } from "../database/client";

/** Couche d'accès aux rendez-vous — enforcement multi-tenant ; accès public par slug. */

export function createAppointmentType(
  organizationId: string,
  data: { name: string; slug: string; durationMinutes: number; description?: string; createdById?: string },
) {
  return prisma.appointmentType.create({
    data: {
      organizationId,
      name: data.name,
      slug: data.slug,
      durationMinutes: data.durationMinutes,
      description: data.description,
      createdById: data.createdById,
    },
  });
}

export function slugExists(slug: string) {
  return prisma.appointmentType.findUnique({ where: { slug }, select: { id: true } });
}

export function listAppointmentTypes(organizationId: string) {
  return prisma.appointmentType.findMany({
    where: { organizationId, deletedAt: null },
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { appointments: true } } },
  });
}

export function getAppointmentTypeById(organizationId: string, id: string) {
  return prisma.appointmentType.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: { availabilities: { orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }] } },
  });
}

export function getAppointmentTypeBySlug(slug: string) {
  return prisma.appointmentType.findFirst({
    where: { slug, active: true, deletedAt: null },
    include: {
      availabilities: { orderBy: [{ dayOfWeek: "asc" }, { startMinutes: "asc" }] },
      organization: { select: { name: true, timezone: true, locale: true } },
    },
  });
}

export async function softDeleteAppointmentType(organizationId: string, id: string) {
  const result = await prisma.appointmentType.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count > 0;
}

/** Remplace les disponibilités d'un type (après vérification d'appartenance). */
export async function setAvailability(
  organizationId: string,
  appointmentTypeId: string,
  windows: { dayOfWeek: number; startMinutes: number; endMinutes: number }[],
) {
  const type = await prisma.appointmentType.findFirst({
    where: { id: appointmentTypeId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!type) return false;

  await prisma.$transaction([
    prisma.availability.deleteMany({ where: { organizationId, appointmentTypeId } }),
    prisma.availability.createMany({
      data: windows.map((w) => ({ organizationId, appointmentTypeId, ...w })),
    }),
  ]);
  return true;
}

/** Rendez-vous confirmés d'un type sur un intervalle (pour bloquer les créneaux). */
export function listBookedBetween(
  organizationId: string,
  appointmentTypeId: string,
  startAt: Date,
  endAt: Date,
) {
  return prisma.appointment.findMany({
    where: {
      organizationId,
      appointmentTypeId,
      status: "CONFIRMED",
      startAt: { gte: startAt, lt: endAt },
    },
    select: { startAt: true, endAt: true },
  });
}

export function createAppointment(
  organizationId: string,
  data: {
    appointmentTypeId: string;
    contactId?: string | null;
    name: string;
    email: string;
    phone?: string;
    startAt: Date;
    endAt: Date;
  },
) {
  return prisma.appointment.create({
    data: {
      organizationId,
      appointmentTypeId: data.appointmentTypeId,
      contactId: data.contactId ?? null,
      name: data.name,
      email: data.email,
      phone: data.phone,
      startAt: data.startAt,
      endAt: data.endAt,
    },
  });
}

export function listUpcomingAppointments(organizationId: string, from: Date, appointmentTypeId?: string) {
  return prisma.appointment.findMany({
    where: {
      organizationId,
      status: "CONFIRMED",
      startAt: { gte: from },
      ...(appointmentTypeId ? { appointmentTypeId } : {}),
    },
    orderBy: { startAt: "asc" },
    take: 50,
    include: { appointmentType: { select: { name: true } } },
  });
}
