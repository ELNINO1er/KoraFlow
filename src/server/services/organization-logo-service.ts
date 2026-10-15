import "server-only";
import { randomUUID } from "node:crypto";
import type { AuthContext } from "@/server/auth/context";
import { prisma } from "@/server/database/client";
import { assertCan } from "@/server/permissions/permissions";
import { deletePrivateFile, putPrivateFile } from "@/server/storage/private-storage";
import { inspectOrganizationLogo } from "@/lib/organizations/logo-validation";

export async function replaceOrganizationLogo(ctx: AuthContext, bytes: Uint8Array) {
  assertCan(ctx.role, "organization.update");
  const inspected = inspectOrganizationLogo(bytes);
  const storageKey = `organization-logos/${ctx.organizationId}/${randomUUID()}.${inspected.extension}`;
  const current = await prisma.organization.findFirst({
    where: { id: ctx.organizationId, deletedAt: null },
    select: { logoUrl: true },
  });
  if (!current) throw new Error("Organisation introuvable.");

  await putPrivateFile(storageKey, bytes);
  try {
    await prisma.$transaction([
      prisma.organization.update({ where: { id: ctx.organizationId }, data: { logoUrl: storageKey } }),
      prisma.auditLog.create({
        data: {
          organizationId: ctx.organizationId,
          actorUserId: ctx.user.id,
          action: "organization.logo_updated",
          targetType: "Organization",
          targetId: ctx.organizationId,
        },
      }),
    ]);
  } catch (error) {
    await deletePrivateFile(storageKey).catch(() => undefined);
    throw error;
  }
  if (current.logoUrl?.startsWith(`organization-logos/${ctx.organizationId}/`)) {
    await deletePrivateFile(current.logoUrl).catch(() => undefined);
  }
  return storageKey;
}

export async function removeOrganizationLogo(ctx: AuthContext) {
  assertCan(ctx.role, "organization.update");
  const current = await prisma.organization.findFirst({
    where: { id: ctx.organizationId, deletedAt: null },
    select: { logoUrl: true },
  });
  if (!current) throw new Error("Organisation introuvable.");
  await prisma.organization.update({ where: { id: ctx.organizationId }, data: { logoUrl: null } });
  if (current.logoUrl?.startsWith(`organization-logos/${ctx.organizationId}/`)) {
    await deletePrivateFile(current.logoUrl).catch(() => undefined);
  }
}
