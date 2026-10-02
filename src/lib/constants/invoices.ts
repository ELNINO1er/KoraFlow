import type { InvoiceStatus, PaymentMethod } from "@prisma/client";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "accent" | "outline";

export const INVOICE_STATUSES: { value: InvoiceStatus; label: string; variant: BadgeVariant }[] = [
  { value: "DRAFT", label: "Brouillon", variant: "outline" },
  { value: "SENT", label: "Envoyée", variant: "default" },
  { value: "PARTIALLY_PAID", label: "Partiellement payée", variant: "warning" },
  { value: "PAID", label: "Payée", variant: "success" },
  { value: "OVERDUE", label: "En retard", variant: "danger" },
  { value: "CANCELED", label: "Annulée", variant: "outline" },
];

/** Statuts qu'un utilisateur peut choisir. Les statuts financiers sont calculés. */
export const MANUAL_INVOICE_STATUSES = INVOICE_STATUSES.filter(
  (status) => status.value !== "PAID" && status.value !== "PARTIALLY_PAID",
);

const MANUAL_TRANSITIONS: Record<InvoiceStatus, readonly InvoiceStatus[]> = {
  DRAFT: ["SENT", "CANCELED"],
  SENT: ["OVERDUE", "CANCELED"],
  OVERDUE: ["SENT", "CANCELED"],
  PARTIALLY_PAID: ["OVERDUE", "CANCELED"],
  PAID: [],
  CANCELED: [],
};

export function isManualInvoiceTransition(current: InvoiceStatus, next: InvoiceStatus): boolean {
  return current === next || MANUAL_TRANSITIONS[current].includes(next);
}

export function manualInvoiceStatusesFor(current: InvoiceStatus) {
  const allowed = new Set<InvoiceStatus>([current, ...MANUAL_TRANSITIONS[current]]);
  return INVOICE_STATUSES.filter((status) => allowed.has(status.value));
}

const MAP = new Map(INVOICE_STATUSES.map((s) => [s.value, s]));
export function invoiceStatusLabel(s: InvoiceStatus): string {
  return MAP.get(s)?.label ?? s;
}
export function invoiceStatusVariant(s: InvoiceStatus): BadgeVariant {
  return MAP.get(s)?.variant ?? "default";
}

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: "WAVE", label: "Wave" },
  { value: "ORANGE_MONEY", label: "Orange Money" },
  { value: "MTN", label: "MTN Mobile Money" },
  { value: "MOOV", label: "Moov Money" },
  { value: "BANK_TRANSFER", label: "Virement bancaire" },
  { value: "CASH", label: "Espèces" },
  { value: "OTHER", label: "Autre" },
];

export function paymentMethodLabel(m: PaymentMethod): string {
  return PAYMENT_METHODS.find((x) => x.value === m)?.label ?? m;
}
