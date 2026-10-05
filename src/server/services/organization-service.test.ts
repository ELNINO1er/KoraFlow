import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type { MembershipRole } from "@prisma/client";
import type { AuthContext } from "../auth/context";
import { prisma } from "../database/client";
import { permissionsForRole, PermissionError } from "../permissions/permissions";
import { getOrganizationSettings, updateOrganizationSettings, type OrganizationSettingsInput } from "./organization-service";

const suffix = `org-settings-${Date.now()}`;
let orgAId = "";
let orgBId = "";
let userId = "";

function context(role: MembershipRole, organizationId = orgAId): AuthContext {
  return {
    user: { id: userId, email: `owner-${suffix}@test.local`, name: "Owner", image: null },
    organizationId,
    organization: { id: organizationId, name: "Org", slug: "org", currency: "XOF", locale: "fr", timezone: "Africa/Abidjan" },
    role,
    permissions: permissionsForRole(role),
    impersonatedBy: null,
  };
}

const update: OrganizationSettingsInput = {
  name: "Elnino Studio",
  legalName: "Elnino Studio SARL",
  email: "contact@example.test",
  phone: "+2250000000000",
  addressLine1: "Abidjan",
  addressLine2: null,
  city: "Abidjan",
  country: "CI",
  currency: "XOF",
  timezone: "Africa/Abidjan",
  locale: "fr",
  taxId: "NCC-TEST",
  taxRegime: "Réel simplifié",
  invoicePrefix: "FAC",
  quotePrefix: "DEV",
  brandColor: "#C8553D",
};

beforeAll(async () => {
  const user = await prisma.user.create({ data: { email: `owner-${suffix}@test.local`, name: "Owner" } });
  userId = user.id;
  const [a, b] = await Promise.all([
    prisma.organization.create({ data: { name: "Org A", slug: `${suffix}-a` } }),
    prisma.organization.create({ data: { name: "Org B", slug: `${suffix}-b` } }),
  ]);
  orgAId = a.id;
  orgBId = b.id;
});

afterAll(async () => {
  await prisma.organization.deleteMany({ where: { id: { in: [orgAId, orgBId] } } });
  await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("paramètres d’organisation", () => {
  it("met à jour uniquement l’organisation active et écrit l’audit", async () => {
    await updateOrganizationSettings(context("OWNER"), update);
    const [a, b, audit] = await Promise.all([
      prisma.organization.findUniqueOrThrow({ where: { id: orgAId } }),
      prisma.organization.findUniqueOrThrow({ where: { id: orgBId } }),
      prisma.auditLog.findFirst({ where: { organizationId: orgAId, action: "organization.settings_updated" } }),
    ]);
    expect(a.name).toBe("Elnino Studio");
    expect(b.name).toBe("Org B");
    expect(audit?.actorUserId).toBe(userId);
  });

  it("refuse la mise à jour à un rôle sans permission", async () => {
    await expect(updateOrganizationSettings(context("CLIENT"), update)).rejects.toBeInstanceOf(PermissionError);
  });

  it("ne lit jamais une autre organisation que celle du contexte", async () => {
    const settings = await getOrganizationSettings(context("OWNER", orgBId));
    expect(settings.name).toBe("Org B");
  });
});
