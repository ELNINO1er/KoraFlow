import { z } from "zod";

/**
 * Validation d'un service du catalogue.
 * `priceMajor` est le montant saisi par l'humain (ex. 50000 FCFA, 49.99 EUR) ;
 * la conversion en plus petite unité (`priceMinor`) est faite dans l'action,
 * selon la devise de l'organisation.
 */
export const serviceInputSchema = z.object({
  name: z.string().trim().min(1, "Le nom est requis.").max(150),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  priceMajor: z.coerce
    .number({ message: "Prix invalide." })
    .min(0, "Le prix ne peut pas être négatif.")
    .max(1_000_000_000),
  unit: z.string().trim().min(1).max(30).default("forfait"),
  category: z
    .string()
    .trim()
    .max(80)
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v)),
  taxRate: z.coerce
    .number()
    .int("Le taux de taxe doit être un entier.")
    .min(0)
    .max(100)
    .default(0),
  estimatedDurationMinutes: z
    .union([z.coerce.number().int().min(0).max(100000), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : Number(v))),
  active: z.coerce.boolean().default(true),
});

export type ServiceInput = z.infer<typeof serviceInputSchema>;

/** Unités de vente suggérées dans le formulaire. */
export const SERVICE_UNITS = [
  "forfait",
  "heure",
  "jour",
  "mois",
  "unité",
  "projet",
] as const;
