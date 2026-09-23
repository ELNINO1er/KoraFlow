import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "../database/client";
import * as repo from "./membership-repository";

const SUFFIX = "iso-test-team";
let orgAId = "";
let orgBId = "";
let userInvitedId = "";
let membershipAId = "";

beforeAll(async () => {
  const orgA = await prisma.organization.create({ data: { name: "Org A", slug: `t-org-a-${SUFFIX}` } });
  const orgB = await prisma.organization.create({ data: { name: "Org B", slug: `t-org-b-${SUFFIX}` } });
  orgAId = orgA.id;
  orgBId = orgB.id;

  // Un propriétaire dans A + un membre dans A (pour tester la garde dernier owner).
  const owner = await prisma.user.create({ data: { email: `owner-${SUFFIX}@t.local`, name: "Owner" } });
  const memberUser = await prisma.user.create({ data: { email: `member-${SUFFIX}@t.local`, name: "Member" } });
  await prisma.membership.create({ data: { organizationId: orgAId, userId: owner.id, role: "OWNER" } });
  const m = await prisma.membership.create({ data: { organizationId: orgAId, userId: memberUser.id, role: "COLLABORATOR" } });
  membershipAId = m.id;

  const invited = await prisma.user.create({ data: { email: `invited-${SUFFIX}@t.local`, name: "Invited" } });
  userInvitedId = invited.id;
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
  await prisma.user.deleteMany({ where: { email: { contains: SUFFIX } } });
  await prisma.$disconnect();
});

describe("équipe : invitations et isolation", () => {
  it("accepte une invitation -> crée l'appartenance et marque ACCEPTED", async () => {
    const inv = await repo.createInvitation(orgAId, {
      email: `invited-${SUFFIX}@t.local`,
      role: "SALES",
      token: `tok-${SUFFIX}`,
      expiresAt: new Date(Date.now() + 3600_000),
    });
    const result = await repo.acceptInvitation(`tok-${SUFFIX}`, userInvitedId);
    expect(result.ok).toBe(true);
    expect(result.organizationId).toBe(orgAId);
    expect(await repo.membershipExists(orgAId, userInvitedId)).not.toBeNull();
    const refreshed = await prisma.invitation.findUnique({ where: { id: inv.id } });
    expect(refreshed?.status).toBe("ACCEPTED");
  });

  it("compte les propriétaires (garde du dernier owner)", async () => {
    expect(await repo.countOwners(orgAId)).toBe(1);
  });

  it("updateMemberRole(B, membreDeA) n'affecte rien", async () => {
    expect(await repo.updateMemberRole(orgBId, membershipAId, "ADMIN")).toBe(false);
    expect((await repo.getMembership(orgAId, membershipAId))?.role).toBe("COLLABORATOR");
  });

  it("removeMember(B, membreDeA) échoue", async () => {
    expect(await repo.removeMember(orgBId, membershipAId)).toBe(false);
    expect(await repo.getMembership(orgAId, membershipAId)).not.toBeNull();
  });
});
