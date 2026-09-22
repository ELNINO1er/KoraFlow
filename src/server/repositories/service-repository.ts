import type { Prisma } from "@prisma/client";
import { prisma } from "../database/client";

/**
 * Couche d'accès au catalogue de services — POINT D'ENFORCEMENT MULTI-TENANT.
 * `organizationId` est inclus dans TOUTES les clauses where ; les mutations
 * passent par updateMany scopé (id + organizationId).
 */

export interface ServiceListParams {
  search?: string;
  activeOnly?: boolean;
  page?: number;
  pageSize?: number;
}

export interface ServiceWriteData {
  name: string;
  description?: string;
  priceMinor: number;
  unit: string;
  category?: string;
  taxRate: number;
  estimatedDurationMinutes?: number;
  active?: boolean;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function createService(organizationId: string, data: ServiceWriteData) {
  return prisma.service.create({ data: { ...data, organizationId } });
}

export async function listServices(
  organizationId: string,
  params: ServiceListParams = {},
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE),
  );

  const where: Prisma.ServiceWhereInput = {
    organizationId,
    deletedAt: null,
  };
  if (params.activeOnly) where.active = true;
  if (params.search && params.search.trim() !== "") {
    const q = params.search.trim();
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { category: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.service.findMany({
      where,
      orderBy: [{ active: "desc" }, { name: "asc" }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.service.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export function getServiceById(organizationId: string, id: string) {
  return prisma.service.findFirst({
    where: { id, organizationId, deletedAt: null },
  });
}

export async function updateService(
  organizationId: string,
  id: string,
  data: Partial<ServiceWriteData>,
) {
  const result = await prisma.service.updateMany({
    where: { id, organizationId, deletedAt: null },
    data,
  });
  if (result.count === 0) return null;
  return getServiceById(organizationId, id);
}

export async function softDeleteService(organizationId: string, id: string) {
  const result = await prisma.service.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count > 0;
}
