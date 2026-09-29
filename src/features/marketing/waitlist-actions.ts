"use server";

import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/server/database/client";
import { rateLimit } from "@/lib/security/rate-limit";

const schema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est requis.").max(80),
  email: z.string().trim().toLowerCase().email("Adresse e-mail invalide.").max(160),
  activity: z.string().trim().max(120).optional(),
  country: z.string().trim().max(80).optional(),
});

export type WaitlistInput = z.infer<typeof schema>;

export async function joinWaitlist(
  input: WaitlistInput,
): Promise<{ ok: boolean; error?: string }> {
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const limited = rateLimit(`waitlist:${ip}`, 5, 60_000);
  if (!limited.ok) {
    return { ok: false, error: "Trop de tentatives. Réessayez dans un instant." };
  }

  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Formulaire invalide." };
  }

  const { firstName, email, activity, country } = parsed.data;
  try {
    // Idempotent : une même adresse ne crée pas de doublon.
    await prisma.waitlistEntry.upsert({
      where: { email },
      update: { firstName, activity: activity || null, country: country || null },
      create: { firstName, email, activity: activity || null, country: country || null },
    });
    return { ok: true };
  } catch {
    return { ok: false, error: "Enregistrement impossible pour le moment." };
  }
}
