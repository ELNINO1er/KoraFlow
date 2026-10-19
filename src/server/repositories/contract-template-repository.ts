import type { Prisma } from "@prisma/client";
import { prisma } from "../database/client";

/**
 * Couche d'accès aux modèles de contrat — enforcement multi-tenant
 * (organizationId systématique). Soft-delete via `deletedAt` (archivage).
 */

export interface ContractTemplateInput {
  name: string;
  body: string;
}

export function listContractTemplates(organizationId: string, includeArchived = false) {
  const where: Prisma.ContractTemplateWhereInput = { organizationId };
  if (!includeArchived) where.deletedAt = null;
  return prisma.contractTemplate.findMany({
    where,
    orderBy: [{ deletedAt: "asc" }, { updatedAt: "desc" }],
  });
}

export function getContractTemplateById(organizationId: string, id: string) {
  return prisma.contractTemplate.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
}

export function createContractTemplate(organizationId: string, data: ContractTemplateInput) {
  return prisma.contractTemplate.create({
    data: { organizationId, name: data.name, body: data.body },
  });
}

export async function updateContractTemplate(
  organizationId: string,
  id: string,
  data: ContractTemplateInput,
) {
  const result = await prisma.contractTemplate.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: { name: data.name, body: data.body },
  });
  if (result.count === 0) return null;
  return getContractTemplateById(organizationId, id);
}

export async function duplicateContractTemplate(organizationId: string, id: string) {
  const source = await getContractTemplateById(organizationId, id);
  if (!source) return null;
  return prisma.contractTemplate.create({
    data: {
      organizationId,
      name: `${source.name} (copie)`.slice(0, 160),
      body: source.body,
    },
  });
}

export async function archiveContractTemplate(organizationId: string, id: string) {
  const result = await prisma.contractTemplate.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count > 0;
}
