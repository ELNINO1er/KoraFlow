import type { Metadata } from "next";
import { Users } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Clients" };

export default function ClientsPage() {
  return (
    <ComingSoon
      title="Clients"
      description="La gestion des prospects et clients (CRM, pipeline, notes, activités) arrive avec le module CRM."
      icon={Users}
      sprint="Sprint 2"
    />
  );
}
