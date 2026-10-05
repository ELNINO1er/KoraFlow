"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAuthContext } from "@/server/auth/context";
import { updateOrganizationSettings } from "@/server/services/organization-service";

const optionalText = (max: number) =>
  z.string().trim().max(max).transform((value) => value || null);

const settingsSchema = z.object({
  name: z.string().trim().min(2).max(120),
  legalName: optionalText(160),
  email: z.union([z.literal(""), z.email()]).transform((value) => value || null),
  phone: optionalText(40),
  addressLine1: optionalText(180),
  addressLine2: optionalText(180),
  city: optionalText(100),
  country: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((value) => value.toUpperCase()),
  currency: z.string().trim().regex(/^[A-Za-z]{3}$/).transform((value) => value.toUpperCase()),
  timezone: z.string().trim().min(1).max(80),
  locale: z.string().trim().regex(/^[a-z]{2}(?:-[A-Z]{2})?$/),
  taxId: optionalText(80),
  taxRegime: optionalText(120),
  invoicePrefix: z.string().trim().min(1).max(10).regex(/^[A-Za-z0-9-]+$/).transform((value) => value.toUpperCase()),
  quotePrefix: z.string().trim().min(1).max(10).regex(/^[A-Za-z0-9-]+$/).transform((value) => value.toUpperCase()),
  brandColor: z.union([z.literal(""), z.string().regex(/^#[0-9A-Fa-f]{6}$/)]).transform((value) => value || null),
});

export type OrganizationSettingsActionResult =
  | { ok: true; message: string }
  | { ok: false; error: string };

export async function updateOrganizationSettingsAction(
  input: unknown,
): Promise<OrganizationSettingsActionResult> {
  const parsed = settingsSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Vérifiez les champs indiqués et leurs formats." };
  }

  try {
    const ctx = await requireAuthContext();
    await updateOrganizationSettings(ctx, parsed.data);
    revalidatePath("/", "layout");
    revalidatePath("/parametres");
    return { ok: true, message: "Les paramètres de l’organisation ont été enregistrés." };
  } catch {
    return { ok: false, error: "Vous n’êtes pas autorisé ou l’enregistrement a échoué." };
  }
}
