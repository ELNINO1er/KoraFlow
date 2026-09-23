import type { Prisma, ProjectStatus, TaskStatus, TaskPriority } from "@prisma/client";
import { prisma } from "../database/client";

/**
 * Couche d'accès aux projets — enforcement multi-tenant (organizationId
 * systématique). Les tâches et étapes sont toujours filtrées par organisation.
 */

export interface ProjectCreateData {
  contactId: string;
  quoteId?: string | null;
  invoiceId?: string | null;
  title: string;
  description?: string | null;
  createdById?: string | null;
  stageNames?: string[];
}

export async function createProject(organizationId: string, data: ProjectCreateData) {
  const stages = data.stageNames ?? ["Cadrage", "Réalisation", "Livraison"];
  return prisma.project.create({
    data: {
      organizationId,
      contactId: data.contactId,
      quoteId: data.quoteId ?? null,
      invoiceId: data.invoiceId ?? null,
      title: data.title,
      description: data.description ?? null,
      createdById: data.createdById ?? null,
      stages: {
        create: stages.map((name, i) => ({ organizationId, name, position: i })),
      },
    },
    include: { stages: { orderBy: { position: "asc" } } },
  });
}

export function getProjectByInvoiceId(organizationId: string, invoiceId: string) {
  return prisma.project.findFirst({ where: { organizationId, invoiceId } });
}

/**
 * Crée (ou renvoie s'il existe déjà) le projet lié à une facture. Idempotent
 * grâce à la contrainte unique sur `invoiceId`. Renvoie null si la facture
 * n'existe pas dans l'organisation.
 */
export async function ensureProjectForInvoice(
  organizationId: string,
  invoiceId: string,
  createdById?: string | null,
) {
  const existing = await getProjectByInvoiceId(organizationId, invoiceId);
  if (existing) return { project: existing, created: false as const };

  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, organizationId },
    select: { contactId: true, quoteId: true, number: true },
  });
  if (!invoice) return null;

  try {
    const project = await createProject(organizationId, {
      contactId: invoice.contactId,
      quoteId: invoice.quoteId,
      invoiceId,
      title: `Projet — ${invoice.number}`,
      createdById: createdById ?? null,
    });
    return { project, created: true as const, number: invoice.number };
  } catch {
    // Course concurrente : la contrainte unique sur invoiceId a joué.
    const project = await getProjectByInvoiceId(organizationId, invoiceId);
    return project ? { project, created: false as const } : null;
  }
}

export async function listProjects(
  organizationId: string,
  params: { status?: ProjectStatus; page?: number; pageSize?: number } = {},
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const where: Prisma.ProjectWhereInput = { organizationId, deletedAt: null };
  if (params.status) where.status = params.status;

  const [items, total] = await Promise.all([
    prisma.project.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: { contact: { select: { firstName: true, lastName: true, companyName: true } } },
    }),
    prisma.project.count({ where }),
  ]);
  return { items, total, page, pageSize };
}

export function getProjectById(organizationId: string, id: string) {
  return prisma.project.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: {
      contact: { select: { id: true, firstName: true, lastName: true, companyName: true } },
      invoice: { select: { number: true } },
      stages: { orderBy: { position: "asc" } },
      tasks: {
        orderBy: [{ position: "asc" }, { createdAt: "asc" }],
        include: { assignee: { select: { id: true, name: true } } },
      },
    },
  });
}

export async function updateProjectStatus(organizationId: string, id: string, status: ProjectStatus) {
  const result = await prisma.project.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: { status },
  });
  if (result.count === 0) return null;
  return getProjectById(organizationId, id);
}

export async function softDeleteProject(organizationId: string, id: string) {
  const result = await prisma.project.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count > 0;
}

// --- Tâches -----------------------------------------------------------------

export interface TaskCreateData {
  projectId: string;
  stageId?: string | null;
  title: string;
  priority?: TaskPriority;
  assigneeId?: string | null;
}

/** Crée une tâche APRÈS avoir vérifié que le projet appartient à l'organisation. */
export async function createTask(organizationId: string, data: TaskCreateData) {
  const project = await prisma.project.findFirst({
    where: { id: data.projectId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!project) return null;

  return prisma.task.create({
    data: {
      organizationId,
      projectId: data.projectId,
      stageId: data.stageId ?? null,
      title: data.title,
      priority: data.priority ?? "MEDIUM",
      assigneeId: data.assigneeId ?? null,
    },
  });
}

/** Change le statut d'une tâche (scopé) et renvoie son projectId, ou null. */
export async function setTaskStatus(organizationId: string, taskId: string, status: TaskStatus) {
  const task = await prisma.task.findFirst({
    where: { id: taskId, organizationId },
    select: { id: true, projectId: true },
  });
  if (!task) return null;
  await prisma.task.update({ where: { id: taskId }, data: { status } });
  return task.projectId;
}

/** Recalcule la progression du projet (part de tâches terminées). */
export async function recomputeProjectProgress(organizationId: string, projectId: string) {
  const [total, done] = await Promise.all([
    prisma.task.count({ where: { organizationId, projectId } }),
    prisma.task.count({ where: { organizationId, projectId, status: "DONE" } }),
  ]);
  const progress = total === 0 ? 0 : Math.round((done / total) * 100);
  await prisma.project.updateMany({
    where: { id: projectId, organizationId },
    data: { progress },
  });
  return progress;
}
