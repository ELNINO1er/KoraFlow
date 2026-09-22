import type { ContractStatus } from "@prisma/client";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "accent" | "outline";

export const CONTRACT_STATUSES: {
  value: ContractStatus;
  label: string;
  variant: BadgeVariant;
}[] = [
  { value: "DRAFT", label: "Brouillon", variant: "outline" },
  { value: "SENT", label: "En attente de signature", variant: "warning" },
  { value: "SIGNED", label: "Signé", variant: "success" },
  { value: "CANCELED", label: "Annulé", variant: "outline" },
];

const MAP = new Map(CONTRACT_STATUSES.map((s) => [s.value, s]));

export function contractStatusLabel(status: ContractStatus): string {
  return MAP.get(status)?.label ?? status;
}

export function contractStatusVariant(status: ContractStatus): BadgeVariant {
  return MAP.get(status)?.variant ?? "default";
}
