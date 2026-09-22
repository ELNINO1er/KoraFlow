import type { QuoteStatus } from "@prisma/client";

type BadgeVariant =
  | "default"
  | "success"
  | "warning"
  | "danger"
  | "accent"
  | "outline";

export const QUOTE_STATUSES: {
  value: QuoteStatus;
  label: string;
  variant: BadgeVariant;
}[] = [
  { value: "DRAFT", label: "Brouillon", variant: "outline" },
  { value: "SENT", label: "Envoyé", variant: "default" },
  { value: "VIEWED", label: "Consulté", variant: "accent" },
  { value: "ACCEPTED", label: "Accepté", variant: "success" },
  { value: "REJECTED", label: "Refusé", variant: "danger" },
  { value: "EXPIRED", label: "Expiré", variant: "warning" },
  { value: "CANCELED", label: "Annulé", variant: "outline" },
];

const MAP = new Map(QUOTE_STATUSES.map((s) => [s.value, s]));

export function quoteStatusLabel(status: QuoteStatus): string {
  return MAP.get(status)?.label ?? status;
}

export function quoteStatusVariant(status: QuoteStatus): BadgeVariant {
  return MAP.get(status)?.variant ?? "default";
}
