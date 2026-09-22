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
