"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import type { TaskPriority, TaskStatus } from "@prisma/client";
import { TASK_PRIORITIES, priorityLabel, priorityVariant } from "@/lib/constants/projects";
import { addTaskAction, toggleTaskAction } from "@/features/projects/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";

export interface StageOption {
  id: string;
  name: string;
}
export interface TaskItem {
  id: string;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
  stageId: string | null;
}

const selectClass =
  "h-10 rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function TaskManager({
  projectId,
  stages,
  tasks,
  canEdit,
}: {
  projectId: string;
  stages: StageOption[];
  tasks: TaskItem[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState<TaskPriority>("MEDIUM");
  const [stageId, setStageId] = useState<string>(stages[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 1) return;
    startTransition(async () => {
      const result = await addTaskAction({
        projectId,
        title: title.trim(),
        priority,
        stageId: stageId || null,
      });
      if (!result.ok) {
        setError(result.error ?? "Ajout impossible.");
        return;
      }
      setTitle("");
      router.refresh();
    });
  }

  function toggle(taskId: string, done: boolean) {
    startTransition(async () => {
      await toggleTaskAction(taskId, done, projectId);
      router.refresh();
    });
  }

  const groups = [
    ...stages.map((s) => ({ id: s.id, name: s.name, tasks: tasks.filter((t) => t.stageId === s.id) })),
    { id: "none", name: "Sans étape", tasks: tasks.filter((t) => !t.stageId) },
  ].filter((g) => g.tasks.length > 0 || g.id !== "none");

  return (
    <div className="flex flex-col gap-5">
      {canEdit ? (
        <form onSubmit={add} className="flex flex-col gap-2 rounded-lg border border-border p-3 sm:flex-row sm:items-center">
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Nouvelle tâche…"
            className="flex-1"
          />
          <select value={priority} onChange={(e) => setPriority(e.target.value as TaskPriority)} className={selectClass}>
            {TASK_PRIORITIES.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
          {stages.length > 0 ? (
            <select value={stageId} onChange={(e) => setStageId(e.target.value)} className={selectClass}>
              {stages.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          ) : null}
          <Button type="submit" disabled={pending || title.trim().length < 1}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Ajouter
          </Button>
        </form>
      ) : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}

      {groups.map((group) => (
        <div key={group.id}>
          <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            {group.name}
          </p>
          {group.tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune tâche.</p>
          ) : (
            <ul className="flex flex-col gap-1">
              {group.tasks.map((t) => (
                <li key={t.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
                  <input
                    type="checkbox"
                    checked={t.status === "DONE"}
                    disabled={!canEdit || pending}
                    onChange={(e) => toggle(t.id, e.target.checked)}
                    className="size-4 rounded border-input accent-[color:var(--color-primary)]"
                  />
                  <span className={`flex-1 text-sm ${t.status === "DONE" ? "text-muted-foreground line-through" : "text-foreground"}`}>
                    {t.title}
                  </span>
                  <Badge variant={priorityVariant(t.priority)}>{priorityLabel(t.priority)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
