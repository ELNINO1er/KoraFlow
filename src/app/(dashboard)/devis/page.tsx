import type { Metadata } from "next";
import { FileText } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Devis" };

export default function QuotesPage() {
  return (
    <ComingSoon
      title="Devis"
      description="Création de devis, PDF, envoi, acceptation et suivi dans le portail client."
      icon={FileText}
      sprint="Sprint 4"
    />
  );
}
