"use server";

import { revalidatePath } from "next/cache";
import { requirePlatformAdmin } from "@/server/auth/platform";
import * as svc from "@/server/services/platform-admin";

type Result = { ok: boolean; error?: string };

function toResult(e: unknown): Result {
  if (e instanceof svc.PlatformAdminError) return { ok: false, error: e.message };
  throw e;
}

export async function suspendOrgAction(
  orgId: string,
  suspended: boolean,
): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    await svc.setOrganizationSuspended(admin, orgId, suspended);
    revalidatePath("/admin/organizations");
    revalidatePath(`/admin/organizations/${orgId}`);
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function suspendUserAction(
  userId: string,
  suspended: boolean,
): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    await svc.setUserSuspended(admin, userId, suspended);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function setPlatformAdminAction(
  userId: string,
  value: boolean,
): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    await svc.setUserPlatformAdmin(admin, userId, value);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}

export async function revokeSessionsAction(userId: string): Promise<Result> {
  const admin = await requirePlatformAdmin();
  try {
    await svc.revokeUserSessions(admin, userId);
    revalidatePath("/admin/users");
    return { ok: true };
  } catch (e) {
    return toResult(e);
  }
}
