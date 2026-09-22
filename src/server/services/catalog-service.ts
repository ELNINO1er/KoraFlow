import "server-only";
import type { AuthContext } from "../auth/context";
import { assertCan } from "../permissions/permissions";
import { prisma } from "../database/client";
import * as services from "../repositories/service-repository";

/**
 * Couche service du catalogue de services.
 * Applique les contrôles de permission (rôle) et l'audit ; scopé à
 * `ctx.organizationId` via le repository.
 */

export async function listServices(
  ctx: AuthContext,
  params: services.ServiceListParams,
) {
  assertCan(ctx.role, "services.view");
  return services.listServices(ctx.organizationId, params);
}

export async function getService(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "services.view");
  return services.getServiceById(ctx.organizationId, id);
}

export async function createService(
  ctx: AuthContext,
  data: services.ServiceWriteData,
) {
  assertCan(ctx.role, "services.create");
  const service = await services.createService(ctx.organizationId, data);
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      action: "service.created",
      targetType: "Service",
      targetId: service.id,
    },
  });
  return service;
}

export async function updateService(
  ctx: AuthContext,
  id: string,
  data: Partial<services.ServiceWriteData>,
) {
  assertCan(ctx.role, "services.update");
  const updated = await services.updateService(ctx.organizationId, id, data);
  if (updated) {
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        actorUserId: ctx.user.id,
        action: "service.updated",
        targetType: "Service",
        targetId: id,
      },
    });
  }
  return updated;
}

export async function deleteService(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "services.delete");
  const ok = await services.softDeleteService(ctx.organizationId, id);
  if (ok) {
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        actorUserId: ctx.user.id,
        action: "service.deleted",
        targetType: "Service",
        targetId: id,
      },
    });
  }
  return ok;
}
