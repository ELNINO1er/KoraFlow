import type { Metadata } from "next";
import { ScrollText } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Contrats" };

export default function ContractsPage() {
  return (
    <ComingSoon
      title="Contrats"
      description="Modèles, génération depuis un devis, signature simple et piste d’audit."
      icon={ScrollText}
      sprint="Sprint 4"
    />
  );
}
