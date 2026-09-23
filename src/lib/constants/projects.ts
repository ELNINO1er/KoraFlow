import type { ProjectStatus, TaskPriority } from "@prisma/client";

type BadgeVariant = "default" | "success" | "warning" | "danger" | "accent" | "outline";

export const PROJECT_STATUSES: { value: ProjectStatus; label: string; variant: BadgeVariant }[] = [
  { value: "PLANNED", label: "Planifié", variant: "outline" },
  { value: "IN_PROGRESS", label: "En cours", variant: "default" },
  { value: "ON_HOLD", label: "En attente", variant: "warning" },
  { value: "IN_REVIEW", label: "En révision", variant: "accent" },
  { value: "COMPLETED", label: "Terminé", variant: "success" },
  { value: "CANCELED", label: "Annulé", variant: "outline" },
];

const PMAP = new Map(PROJECT_STATUSES.map((s) => [s.value, s]));
export function projectStatusLabel(s: ProjectStatus): string {
  return PMAP.get(s)?.label ?? s;
}
export function projectStatusVariant(s: ProjectStatus): BadgeVariant {
  return PMAP.get(s)?.variant ?? "default";
}

export const TASK_PRIORITIES: { value: TaskPriority; label: string; variant: BadgeVariant }[] = [
  { value: "LOW", label: "Basse", variant: "outline" },
  { value: "MEDIUM", label: "Moyenne", variant: "default" },
  { value: "HIGH", label: "Haute", variant: "danger" },
];

const PRMAP = new Map(TASK_PRIORITIES.map((p) => [p.value, p]));
export function priorityLabel(p: TaskPriority): string {
  return PRMAP.get(p)?.label ?? p;
}
export function priorityVariant(p: TaskPriority): BadgeVariant {
  return PRMAP.get(p)?.variant ?? "default";
}
