import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { getProject } from "@/server/services/project-service";
import { projectStatusLabel, projectStatusVariant } from "@/lib/constants/projects";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ProjectStatusControl, DeleteProjectButton } from "@/features/projects/project-controls";
import { TaskManager } from "@/features/projects/task-manager";

export const metadata: Metadata = { title: "Projet" };

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireAuthContext();
  const { id } = await params;
  const project = await getProject(ctx, id);
  if (!project) notFound();

  const canUpdate = can(ctx.role, "projects.update");
  const canDelete = can(ctx.role, "projects.delete");
  const clientName = project.contact.companyName ?? `${project.contact.firstName} ${project.contact.lastName ?? ""}`.trim();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link href="/projets" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Retour aux projets
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-foreground">{project.title}</h1>
            <Badge variant={projectStatusVariant(project.status)}>{projectStatusLabel(project.status)}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canUpdate ? <ProjectStatusControl id={project.id} current={project.status} /> : null}
            {canDelete ? <DeleteProjectButton id={project.id} /> : null}
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          Client : {clientName}
          {project.invoice ? ` · Facture ${project.invoice.number}` : ""}
        </p>
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-1 flex items-center justify-between text-sm">
            <span className="text-muted-foreground">Progression</span>
            <span className="font-medium text-foreground">{project.progress}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-accent" style={{ width: `${project.progress}%` }} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tâches</CardTitle>
        </CardHeader>
        <CardContent>
          <TaskManager
            projectId={project.id}
            canEdit={canUpdate}
            stages={project.stages.map((s) => ({ id: s.id, name: s.name }))}
            tasks={project.tasks.map((t) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              stageId: t.stageId,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
