"use server";

import { headers } from "next/headers";
import { getBookingSlots, bookAppointment } from "@/server/services/appointment-service";
import { rateLimit } from "@/lib/security/rate-limit";

export async function getSlotsAction(slug: string, dateISO: string): Promise<number[]> {
  return getBookingSlots(slug, dateISO);
}

export async function bookAction(
  slug: string,
  input: { dateISO: string; startMinutes: number; name: string; email: string; phone?: string },
): Promise<{ ok: boolean; error?: string }> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || "unknown";
  const rl = rateLimit(`book:${ip}:${slug}`, 5, 60_000);
  if (!rl.ok) return { ok: false, error: "Trop de tentatives. Réessayez dans un instant." };

  return bookAppointment(slug, input, { ipAddress: ip });
}
