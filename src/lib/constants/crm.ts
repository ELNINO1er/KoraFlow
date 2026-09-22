import type { ContactStage, ContactType } from "@prisma/client";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "accent"
  | "outline";

/** Étapes du pipeline dans l'ordre, avec libellé FR et style de badge. */
export const CONTACT_STAGES: {
  value: ContactStage;
  label: string;
  variant: BadgeVariant;
}[] = [
  { value: "NEW_REQUEST", label: "Nouvelle demande", variant: "accent" },
  { value: "TO_CONTACT", label: "À contacter", variant: "warning" },
  { value: "APPOINTMENT_SCHEDULED", label: "Rendez-vous planifié", variant: "default" },
  { value: "QUOTE_IN_PREPARATION", label: "Devis en préparation", variant: "default" },
  { value: "QUOTE_SENT", label: "Devis envoyé", variant: "default" },
  { value: "NEGOTIATION", label: "Négociation", variant: "warning" },
  { value: "CONVERTED", label: "Converti", variant: "success" },
  { value: "LOST", label: "Perdu", variant: "danger" },
];

const STAGE_MAP = new Map(CONTACT_STAGES.map((s) => [s.value, s]));

export function stageLabel(stage: ContactStage): string {
  return STAGE_MAP.get(stage)?.label ?? stage;
}

export function stageVariant(stage: ContactStage): BadgeVariant {
  return STAGE_MAP.get(stage)?.variant ?? "default";
}

export const CONTACT_TYPES: { value: ContactType; label: string }[] = [
  { value: "PROSPECT", label: "Prospect" },
  { value: "CLIENT", label: "Client" },
];

export function contactTypeLabel(type: ContactType): string {
  return type === "CLIENT" ? "Client" : "Prospect";
}
