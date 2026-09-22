import { z } from "zod";
import { ContactType, ContactStage } from "@prisma/client";

/** Chaîne optionnelle : les champs vides du formulaire deviennent `undefined`. */
const optionalText = (max: number) =>
  z
    .string()
    .trim()
    .max(max)
    .optional()
    .transform((v) => (v === "" || v === undefined ? undefined : v));

export const createContactSchema = z.object({
  firstName: z.string().trim().min(1, "Le prénom est requis.").max(100),
  lastName: optionalText(100),
  email: z
    .string()
    .trim()
    .email("Adresse e-mail invalide.")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  phone: optionalText(40),
  companyName: optionalText(150),
  source: optionalText(100),
  notes: optionalText(5000),
  type: z.nativeEnum(ContactType).optional(),
  stage: z.nativeEnum(ContactStage).optional(),
  ownerId: optionalText(60),
});

export const updateContactSchema = createContactSchema.partial();

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
