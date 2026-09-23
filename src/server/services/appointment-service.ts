import "server-only";
import type { AuthContext } from "../auth/context";
import { assertCan } from "../permissions/permissions";
import { prisma } from "../database/client";
import * as appts from "../repositories/appointment-repository";
import { slugify } from "@/lib/formatting/slug";
import { computeSlots } from "@/lib/appointments/slots";

/**
 * ⚠️ Fuseau horaire : le MVP suppose que l'organisation opère à UTC+0
 * (Africa/Abidjan, cas par défaut). L'heure locale saisie == heure UTC stockée.
 * La prise en charge de fuseaux à décalage est un chantier ultérieur.
 */

export class AppointmentError extends Error {}

export async function listTypes(ctx: AuthContext) {
  assertCan(ctx.role, "appointments.view");
  return appts.listAppointmentTypes(ctx.organizationId);
}

export async function getType(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "appointments.view");
  return appts.getAppointmentTypeById(ctx.organizationId, id);
}

export async function listUpcoming(ctx: AuthContext) {
  assertCan(ctx.role, "appointments.view");
  return appts.listUpcomingAppointments(ctx.organizationId, new Date());
}

async function uniqueSlug(base: string): Promise<string> {
  const root = slugify(base) || "rendez-vous";
  let candidate = root;
  let n = 2;
  while (await appts.slugExists(candidate)) {
    candidate = `${root}-${n}`;
    n += 1;
  }
  return candidate;
}

export async function createType(
  ctx: AuthContext,
  input: { name: string; durationMinutes: number; description?: string },
) {
  assertCan(ctx.role, "appointments.create");
  const slug = await uniqueSlug(input.name);
  const type = await appts.createAppointmentType(ctx.organizationId, {
    name: input.name,
    slug,
    durationMinutes: input.durationMinutes,
    description: input.description,
    createdById: ctx.user.id,
  });
  await prisma.auditLog.create({
    data: { organizationId: ctx.organizationId, actorUserId: ctx.user.id, action: "appointment_type.created", targetType: "AppointmentType", targetId: type.id },
  });
  return type;
}

export async function setAvailability(
  ctx: AuthContext,
  typeId: string,
  windows: { dayOfWeek: number; startMinutes: number; endMinutes: number }[],
) {
  assertCan(ctx.role, "appointments.update");
  const clean = windows.filter((w) => w.endMinutes > w.startMinutes && w.dayOfWeek >= 0 && w.dayOfWeek <= 6);
  return appts.setAvailability(ctx.organizationId, typeId, clean);
}

export async function deleteType(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "appointments.delete");
  return appts.softDeleteAppointmentType(ctx.organizationId, id);
}

// --- Réservation publique (par slug, sans authentification) -----------------

function parseDate(dateISO: string): { y: number; m: number; d: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateISO);
  if (!m) return null;
  return { y: Number(m[1]), m: Number(m[2]), d: Number(m[3]) };
}

interface SlotType {
  id: string;
  organizationId: string;
  durationMinutes: number;
  bufferAfterMinutes: number;
  minNoticeHours: number;
  availabilities: { dayOfWeek: number; startMinutes: number; endMinutes: number }[];
}

async function slotsFor(type: SlotType, dateISO: string): Promise<number[]> {
  const parsed = parseDate(dateISO);
  if (!parsed) return [];
  const { y, m, d } = parsed;

  const dayStart = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
  const dayEnd = new Date(dayStart.getTime() + 24 * 3600 * 1000);
  const dayOfWeek = dayStart.getUTCDay();

  const windows = type.availabilities.filter((a) => a.dayOfWeek === dayOfWeek);
  if (windows.length === 0) return [];

  const booked = await appts.listBookedBetween(type.organizationId, type.id, dayStart, dayEnd);
  const bookedWindows = booked.map((b) => ({
    startMinutes: b.startAt.getUTCHours() * 60 + b.startAt.getUTCMinutes(),
    endMinutes: b.endAt.getUTCHours() * 60 + b.endAt.getUTCMinutes(),
  }));

  const earliestMs = Date.now() + type.minNoticeHours * 3600 * 1000;
  const minStartMinutes = Math.max(0, Math.ceil((earliestMs - dayStart.getTime()) / 60000));

  return computeSlots({
    windows,
    durationMinutes: type.durationMinutes,
    bufferAfterMinutes: type.bufferAfterMinutes,
    booked: bookedWindows,
    minStartMinutes,
  });
}

/** Liste des N prochains jours (dates ISO UTC) pour la page de réservation. */
export function getBookingDays(count = 14): string[] {
  const base = Date.now();
  const out: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(base + i * 86400000);
    out.push(
      `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`,
    );
  }
  return out;
}

export async function getBookingSlots(slug: string, dateISO: string): Promise<number[]> {
  const type = await appts.getAppointmentTypeBySlug(slug);
  if (!type) return [];
  return slotsFor(type, dateISO);
}

export async function bookAppointment(
  slug: string,
  input: { dateISO: string; startMinutes: number; name: string; email: string; phone?: string },
  meta: { ipAddress?: string } = {},
): Promise<{ ok: boolean; error?: string }> {
  const type = await appts.getAppointmentTypeBySlug(slug);
  if (!type) return { ok: false, error: "Type de rendez-vous indisponible." };
  if (input.name.trim().length < 2) return { ok: false, error: "Votre nom est requis." };
  if (!/^\S+@\S+\.\S+$/.test(input.email.trim())) return { ok: false, error: "E-mail invalide." };

  // Re-vérifie que le créneau est bien disponible (anti double-réservation).
  const available = await slotsFor(type, input.dateISO);
  if (!available.includes(input.startMinutes)) {
    return { ok: false, error: "Ce créneau n'est plus disponible." };
  }

  const parsed = parseDate(input.dateISO)!;
  const startAt = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, Math.floor(input.startMinutes / 60), input.startMinutes % 60));
  const endAt = new Date(startAt.getTime() + type.durationMinutes * 60000);
  const organizationId = type.organizationId;

  await prisma.$transaction(async (tx) => {
    const contact = await tx.contact.create({
      data: {
        organizationId,
        type: "PROSPECT",
        stage: "APPOINTMENT_SCHEDULED",
        firstName: input.name.trim(),
        email: input.email.trim(),
        phone: input.phone,
        source: `Rendez-vous : ${type.name}`,
      },
    });
    await tx.appointment.create({
      data: {
        organizationId,
        appointmentTypeId: type.id,
        contactId: contact.id,
        name: input.name.trim(),
        email: input.email.trim(),
        phone: input.phone,
        startAt,
        endAt,
      },
    });
    await tx.contactActivity.create({
      data: { organizationId, contactId: contact.id, type: "CREATED", content: `Rendez-vous « ${type.name} » réservé` },
    });
    await tx.auditLog.create({
      data: { organizationId, action: "appointment.booked", targetType: "AppointmentType", targetId: type.id, ipAddress: meta.ipAddress, metadata: { startAt: startAt.toISOString() } },
    });
  });

  // Confirmation par e-mail (best-effort).
  try {
    const { sendEmail } = await import("../integrations/email/mailer");
    const dtf = new Intl.DateTimeFormat(type.organization.locale === "fr" ? "fr-FR" : type.organization.locale, {
      dateStyle: "full",
      timeStyle: "short",
      timeZone: "UTC",
    });
    await sendEmail({
      to: input.email.trim(),
      subject: `Confirmation de votre rendez-vous — ${type.name}`,
      html: `<p>Bonjour ${input.name},</p>
<p>Votre rendez-vous « ${type.name} » est confirmé pour le <strong>${dtf.format(startAt)}</strong>.</p>
<p>${type.organization.name}</p>`,
      text: `Rendez-vous « ${type.name} » confirmé le ${dtf.format(startAt)}.`,
    });
  } catch {
    // L'échec d'envoi ne doit pas annuler la réservation.
  }

  return { ok: true };
}
