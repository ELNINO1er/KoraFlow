import "server-only";
import type { ProjectStatus, TaskPriority } from "@prisma/client";
import type { AuthContext } from "../auth/context";
import { assertCan } from "../permissions/permissions";
import { prisma } from "../database/client";
import * as projects from "../repositories/project-repository";

export async function listProjects(
  ctx: AuthContext,
  params: { status?: ProjectStatus; page?: number },
) {
  assertCan(ctx.role, "projects.view");
  return projects.listProjects(ctx.organizationId, params);
}

export async function getProject(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "projects.view");
  return projects.getProjectById(ctx.organizationId, id);
}

export async function changeProjectStatus(ctx: AuthContext, id: string, status: ProjectStatus) {
  assertCan(ctx.role, "projects.update");
  const updated = await projects.updateProjectStatus(ctx.organizationId, id, status);
  if (updated) {
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        actorUserId: ctx.user.id,
        action: "project.status_changed",
        targetType: "Project",
        targetId: id,
        metadata: { status },
      },
    });
  }
  return updated;
}

export async function deleteProject(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "projects.delete");
  return projects.softDeleteProject(ctx.organizationId, id);
}

export async function addTask(
  ctx: AuthContext,
  input: { projectId: string; title: string; priority?: TaskPriority; stageId?: string | null },
) {
  assertCan(ctx.role, "projects.update");
  const task = await projects.createTask(ctx.organizationId, {
    projectId: input.projectId,
    title: input.title,
    priority: input.priority,
    stageId: input.stageId ?? null,
  });
  if (task) {
    await projects.recomputeProjectProgress(ctx.organizationId, input.projectId);
  }
  return task;
}

export async function toggleTaskDone(ctx: AuthContext, taskId: string, done: boolean) {
  assertCan(ctx.role, "projects.update");
  const projectId = await projects.setTaskStatus(
    ctx.organizationId,
    taskId,
    done ? "DONE" : "TODO",
  );
  if (projectId) {
    await projects.recomputeProjectProgress(ctx.organizationId, projectId);
  }
  return projectId;
}

/**
 * Crée automatiquement un projet pour une facture (idempotent via invoiceId
 * unique). Déclenché lorsqu'une facture devient PAYÉE. N'exige pas de
 * permission : c'est un effet de bord système du paiement.
 */
export async function ensureProjectForInvoice(
  organizationId: string,
  invoiceId: string,
  createdById?: string,
) {
  const result = await projects.ensureProjectForInvoice(organizationId, invoiceId, createdById);
  if (!result) return null;

  // Journalise uniquement si un projet vient d'être créé.
  if (result.created) {
    await prisma.auditLog.create({
      data: {
        organizationId,
        actorUserId: createdById ?? null,
        action: "project.auto_created",
        targetType: "Project",
        targetId: result.project.id,
        metadata: { invoiceId, number: result.number },
      },
    });
  }
  return result.project;
}
