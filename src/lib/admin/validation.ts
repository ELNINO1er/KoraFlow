import { z } from "zod";

export const sensitiveConfirmationSchema = z.object({
  password: z.string().min(1, "Confirmez votre mot de passe.").max(128),
  reason: z.string().trim().min(5, "Précisez un motif d’au moins 5 caractères.").max(500),
});
export type SensitiveConfirmation = z.infer<typeof sensitiveConfirmationSchema>;

export const newAdminSchema = z.object({
  email: z.string().trim().toLowerCase().pipe(z.email().max(254)),
  name: z.string().trim().min(2).max(120),
  initialPassword: z.string().min(12, "Le mot de passe initial doit contenir au moins 12 caractères.").max(128),
});

export const organizationEditSchema = z.object({
  name: z.string().trim().min(2).max(150),
  legalName: z.string().trim().max(200).nullable(),
  email: z.union([z.email(), z.literal("")]).nullable(),
  phone: z.string().trim().max(40).nullable(),
  city: z.string().trim().max(100).nullable(),
  country: z.string().trim().regex(/^[a-z]{2}$/i).transform((v) => v.toUpperCase()),
  currency: z.string().trim().regex(/^[a-z]{3}$/i).transform((v) => v.toUpperCase()),
  timezone: z.string().max(100).refine((value) => {
    try { new Intl.DateTimeFormat("fr", { timeZone: value }); return true; } catch { return false; }
  }, "Fuseau horaire invalide."),
  locale: z.string().min(2).max(30).refine((value) => {
    try { new Intl.DateTimeFormat(value); return true; } catch { return false; }
  }, "Langue invalide."),
});
