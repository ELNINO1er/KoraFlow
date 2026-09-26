import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../database/client";
import type { PlatformAdmin } from "../auth/platform";
import {
  setOrganizationSuspended,
  setUserSuspended,
  setUserPlatformAdmin,
  revokeUserSessions,
  updateOrganization,
  softDeleteOrganization,
  restoreOrganization,
  addOrgMember,
  changeOrgMemberRole,
  removeOrgMember,
  forceVerifyEmail,
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

  it("édite le profil d'une organisation", async () => {
    await updateOrganization(admin(), orgId, {
      name: "Org Plat Renommée",
      legalName: "SARL Test",
      email: "contact@test.local",
      phone: null,
      city: "Abidjan",
      country: "ci",
      currency: "eur",
      timezone: "Africa/Abidjan",
      locale: "fr",
    });
    const org = await prisma.organization.findUnique({ where: { id: orgId } });
    expect(org?.name).toBe("Org Plat Renommée");
    expect(org?.country).toBe("CI"); // normalisé en majuscules
    expect(org?.currency).toBe("EUR");
  });

  it("refuse un nom d'organisation trop court", async () => {
    await expect(
      updateOrganization(admin(), orgId, {
        name: "x",
        legalName: null,
        email: null,
        phone: null,
        city: null,
        country: "CI",
        currency: "XOF",
        timezone: "Africa/Abidjan",
        locale: "fr",
      }),
    ).rejects.toBeInstanceOf(PlatformAdminError);
  });

  it("supprime puis restaure une organisation (soft delete)", async () => {
    await softDeleteOrganization(admin(), orgId);
    let org = await prisma.organization.findUnique({ where: { id: orgId } });
    expect(org?.deletedAt).not.toBeNull();

    await restoreOrganization(admin(), orgId);
    org = await prisma.organization.findUnique({ where: { id: orgId } });
    expect(org?.deletedAt).toBeNull();
  });

  it("ajoute un membre, change son rôle, protège le dernier propriétaire, puis le retire", async () => {
    // targetUser devient OWNER de l'org
    await addOrgMember(admin(), orgId, `target-${SUFFIX}@test.local`, "OWNER");
    const m = await prisma.membership.findUnique({
      where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
    });
    expect(m?.role).toBe("OWNER");

    // Impossible de rétrograder le dernier propriétaire
    await expect(
      changeOrgMemberRole(admin(), orgId, m!.id, "SALES"),
    ).rejects.toBeInstanceOf(PlatformAdminError);

    // Impossible de retirer le dernier propriétaire
    await expect(removeOrgMember(admin(), orgId, m!.id)).rejects.toBeInstanceOf(
      PlatformAdminError,
    );

    // Ajout d'un 2e propriétaire → on peut alors retirer le 1er
    const other = await prisma.user.create({
      data: { email: `owner2-${SUFFIX}@test.local`, name: "Owner2" },
    });
    await addOrgMember(admin(), orgId, `owner2-${SUFFIX}@test.local`, "OWNER");
    await removeOrgMember(admin(), orgId, m!.id);
    expect(
      await prisma.membership.findUnique({
        where: { userId_organizationId: { userId: targetUserId, organizationId: orgId } },
      }),
    ).toBeNull();

    await prisma.membership.deleteMany({ where: { organizationId: orgId } });
    await prisma.user.deleteMany({ where: { id: other.id } });
  });

  it("refuse d'ajouter un membre dont l'e-mail n'a pas de compte", async () => {
    await expect(
      addOrgMember(admin(), orgId, "inexistant@nulle-part.local", "SALES"),
    ).rejects.toBeInstanceOf(PlatformAdminError);
  });

  it("force la vérification de l'e-mail d'un compte", async () => {
    await prisma.user.update({ where: { id: targetUserId }, data: { emailVerified: false } });
    await forceVerifyEmail(admin(), targetUserId);
    const u = await prisma.user.findUnique({ where: { id: targetUserId } });
    expect(u?.emailVerified).toBe(true);
  });
});
