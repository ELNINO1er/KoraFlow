import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../database/client";
import type { PlatformAdmin } from "../auth/platform";
import {
  setOrganizationSuspended,
  setUserSuspended,
  setUserPlatformAdmin,
  revokeUserSessions,
  PlatformAdminError,
} from "./platform-admin";

const SUFFIX = "plat-admin-test";
let orgId = "";
let adminUserId = "";
let targetUserId = "";

const admin = (): PlatformAdmin => ({
  id: adminUserId,
  email: `admin-${SUFFIX}@test.local`,
  name: "Admin",
});

beforeAll(async () => {
  const org = await prisma.organization.create({
    data: { name: "Org Plat", slug: `plat-org-${SUFFIX}` },
  });
  orgId = org.id;

  const a = await prisma.user.create({
    data: { email: `admin-${SUFFIX}@test.local`, name: "Admin", isPlatformAdmin: true },
  });
  adminUserId = a.id;

  const t = await prisma.user.create({
    data: { email: `target-${SUFFIX}@test.local`, name: "Cible" },
  });
  targetUserId = t.id;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({
    where: { actorUserId: { in: [adminUserId] } },
  });
  await prisma.session.deleteMany({ where: { userId: { in: [targetUserId] } } });
  await prisma.organization.deleteMany({ where: { id: orgId } });
  await prisma.user.deleteMany({ where: { id: { in: [adminUserId, targetUserId] } } });
  await prisma.$disconnect();
});

describe("platform-admin — gestion des accès", () => {
  it("promeut puis révoque un utilisateur admin plateforme", async () => {
    await setUserPlatformAdmin(admin(), targetUserId, true);
    let u = await prisma.user.findUnique({ where: { id: targetUserId } });
    expect(u?.isPlatformAdmin).toBe(true);

    await setUserPlatformAdmin(admin(), targetUserId, false);
    u = await prisma.user.findUnique({ where: { id: targetUserId } });
    expect(u?.isPlatformAdmin).toBe(false);
  });

  it("interdit à un admin de retirer son propre accès plateforme", async () => {
    await expect(setUserPlatformAdmin(admin(), adminUserId, false)).rejects.toBeInstanceOf(
      PlatformAdminError,
    );
    const u = await prisma.user.findUnique({ where: { id: adminUserId } });
    expect(u?.isPlatformAdmin).toBe(true);
  });

  it("interdit de suspendre son propre compte", async () => {
    await expect(setUserSuspended(admin(), adminUserId, true)).rejects.toBeInstanceOf(
      PlatformAdminError,
    );
  });

  it("suspend un utilisateur et révoque ses sessions actives", async () => {
    await prisma.session.create({
      data: {
        id: `sess-${SUFFIX}`,
        token: `tok-${SUFFIX}`,
        userId: targetUserId,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });

    await setUserSuspended(admin(), targetUserId, true);
    const u = await prisma.user.findUnique({ where: { id: targetUserId } });
    expect(u?.suspendedAt).not.toBeNull();

    const sessions = await prisma.session.count({ where: { userId: targetUserId } });
    expect(sessions).toBe(0);

    // Réactivation
    await setUserSuspended(admin(), targetUserId, false);
    const u2 = await prisma.user.findUnique({ where: { id: targetUserId } });
    expect(u2?.suspendedAt).toBeNull();
  });

  it("suspend puis réactive une organisation, avec trace d'audit", async () => {
    await setOrganizationSuspended(admin(), orgId, true);
    let org = await prisma.organization.findUnique({ where: { id: orgId } });
    expect(org?.suspendedAt).not.toBeNull();

    await setOrganizationSuspended(admin(), orgId, false);
    org = await prisma.organization.findUnique({ where: { id: orgId } });
    expect(org?.suspendedAt).toBeNull();

    const logged = await prisma.auditLog.count({
      where: { actorUserId: adminUserId, action: "platform.org_suspended", targetId: orgId },
    });
    expect(logged).toBeGreaterThanOrEqual(1);
  });

  it("révoque les sessions sans suspendre (déconnexion forcée)", async () => {
    await prisma.session.create({
      data: {
        id: `sess2-${SUFFIX}`,
        token: `tok2-${SUFFIX}`,
        userId: targetUserId,
        expiresAt: new Date(Date.now() + 3600_000),
      },
    });
    const count = await revokeUserSessions(admin(), targetUserId);
    expect(count).toBe(1);
    expect(await prisma.session.count({ where: { userId: targetUserId } })).toBe(0);
  });
});
