"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import type { ProjectStatus } from "@prisma/client";
import { PROJECT_STATUSES } from "@/lib/constants/projects";
import { FormSelect } from "@/components/ui/form-select";
import { changeProjectStatusAction, deleteProjectAction } from "@/features/projects/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function ProjectStatusControl({ id, current }: { id: string; current: ProjectStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  return (
    <FormSelect
      value={current}
      disabled={pending}
      aria-label="Statut du projet"
      options={PROJECT_STATUSES}
      className="h-9 w-auto min-w-40"
      onValueChange={(value) => {
        const next = value as ProjectStatus;
        if (next === current) return;
        startTransition(async () => {
          const result = await changeProjectStatusAction(id, next);
          if (!result.ok) {
            toast({ title: "Statut non modifié", description: result.error, variant: "danger" });
            return;
          }
          toast({ title: "Projet mis à jour", variant: "success" });
          router.refresh();
        });
      }}
    />
  );
}

export function DeleteProjectButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="text-danger hover:bg-danger/10"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Supprimer ce projet ?")) return;
        startTransition(async () => {
          await deleteProjectAction(id);
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      Supprimer
    </Button>
  );
}
