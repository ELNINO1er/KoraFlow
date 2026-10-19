import { z } from "zod";

/** Section rédactionnelle libre d'un devis/facture (livrables, périmètre, exclusions, délais…). */
export const sectionSchema = z.object({
  heading: z.string().trim().min(1, "Titre de section requis.").max(160),
  body: z.string().trim().min(1, "Contenu de section requis.").max(8000),
});

export const sectionsSchema = z.array(sectionSchema).max(20);

export type DocumentSection = z.infer<typeof sectionSchema>;

/** Convertit une valeur JSON stockée en liste de sections valides (tolérant). */
export function parseSections(value: unknown): DocumentSection[] {
  const result = sectionsSchema.safeParse(value);
  return result.success ? result.data : [];
}
