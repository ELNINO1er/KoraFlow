import type { Metadata } from "next";
import { FolderKanban } from "lucide-react";
import { ComingSoon } from "@/components/layout/coming-soon";

export const metadata: Metadata = { title: "Projets" };

export default function ProjectsPage() {
  return (
    <ComingSoon
      title="Projets"
      description="Projets, étapes, tâches, progression, documents et validation client."
      icon={FolderKanban}
      sprint="Sprint 6"
    />
  );
}
