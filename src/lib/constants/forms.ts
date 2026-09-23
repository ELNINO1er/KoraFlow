import type { FormFieldType } from "@prisma/client";

export const FIELD_TYPES: { value: FormFieldType; label: string }[] = [
  { value: "TEXT", label: "Texte" },
  { value: "EMAIL", label: "E-mail" },
  { value: "PHONE", label: "Téléphone" },
  { value: "TEXTAREA", label: "Texte long" },
  { value: "NUMBER", label: "Nombre" },
  { value: "DATE", label: "Date" },
  { value: "SELECT", label: "Liste déroulante" },
  { value: "CONSENT", label: "Consentement (case à cocher)" },
];

export function fieldTypeLabel(t: FormFieldType): string {
  return FIELD_TYPES.find((f) => f.value === t)?.label ?? t;
}
