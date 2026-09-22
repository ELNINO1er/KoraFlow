import type { Metadata } from "next";
import { ReceiptText } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Factures" };

export default function InvoicesPage() {
  return (
    <ComingSoon
      title="Factures"
      description="Facturation, acomptes, relances, paiements Mobile Money et abstraction FNE."
      icon={ReceiptText}
      sprint="Sprint 5"
    />
  );
}
