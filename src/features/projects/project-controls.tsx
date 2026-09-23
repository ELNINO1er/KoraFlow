"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import type { ProjectStatus } from "@prisma/client";
import { PROJECT_STATUSES } from "@/lib/constants/projects";
import { changeProjectStatusAction, deleteProjectAction } from "@/features/projects/actions";
import { Button } from "@/components/ui/button";

export function ProjectStatusControl({ id, current }: { id: string; current: ProjectStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <select
      value={current}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as ProjectStatus;
        if (next === current) return;
        startTransition(async () => {
          await changeProjectStatusAction(id, next);
          router.refresh();
        });
      }}
      className="h-9 rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
    >
      {PROJECT_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
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
