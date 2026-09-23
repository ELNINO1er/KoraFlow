"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import type { ProjectStatus, TaskPriority } from "@prisma/client";
import { resolveSession, type AuthContext } from "@/server/auth/context";
import * as projectService from "@/server/services/project-service";
import { PermissionError } from "@/server/permissions/permissions";

async function getContext(): Promise<AuthContext> {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "no-organization") redirect("/create-organization");
  return session.context;
}

export async function changeProjectStatusAction(id: string, status: ProjectStatus) {
  const ctx = await getContext();
  try {
    await projectService.changeProjectStatus(ctx, id, status);
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath(`/projets/${id}`);
  revalidatePath("/projets");
}

export async function addTaskAction(input: {
  projectId: string;
  title: string;
  priority: TaskPriority;
  stageId?: string | null;
}): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getContext();
  if (input.title.trim().length < 1) return { ok: false, error: "Titre requis." };
  try {
    const task = await projectService.addTask(ctx, {
      projectId: input.projectId,
      title: input.title.trim(),
      priority: input.priority,
      stageId: input.stageId ?? null,
    });
    if (!task) return { ok: false, error: "Projet introuvable." };
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    throw e;
  }
  revalidatePath(`/projets/${input.projectId}`);
  return { ok: true };
}

export async function toggleTaskAction(taskId: string, done: boolean, projectId: string) {
  const ctx = await getContext();
  try {
    await projectService.toggleTaskDone(ctx, taskId, done);
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath(`/projets/${projectId}`);
}

export async function deleteProjectAction(id: string) {
  const ctx = await getContext();
  try {
    await projectService.deleteProject(ctx, id);
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath("/projets");
  redirect("/projets");
}
