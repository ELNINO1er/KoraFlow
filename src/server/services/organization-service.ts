import "server-only";
import type { Prisma } from "@prisma/client";
import type { AuthContext } from "../auth/context";
import { prisma } from "../database/client";
import { assertCan } from "../permissions/permissions";
import { slugify } from "@/lib/formatting/slug";

export interface CreateOrganizationInput {
  /** Utilisateur qui crée l'organisation ; il en devient PROPRIÉTAIRE. */
  userId: string;
  name: string;
  country?: string;
  currency?: string;
  locale?: string;
  timezone?: string;
}

/** Génère un slug unique à partir du nom, en suffixant si nécessaire (-2, -3, …). */
async function generateUniqueSlug(
  tx: Prisma.TransactionClient,
  base: string,
): Promise<string> {
  const root = slugify(base) || "organisation";
  let candidate = root;
  let n = 2;
  // Boucle bornée en pratique par le nombre de collisions réelles.
  while (
    await tx.organization.findUnique({
      where: { slug: candidate },
      select: { id: true },
    })
  ) {
    candidate = `${root}-${n}`;
    n += 1;
  }
  return candidate;
}

/**
 * Crée une organisation et rattache son créateur comme PROPRIÉTAIRE.
 * Opération transactionnelle : organisation + appartenance + journal d'audit
 * sont créés atomiquement (tout ou rien).
 */
export async function createOrganization(input: CreateOrganizationInput) {
  return prisma.$transaction(async (tx) => {
    const slug = await generateUniqueSlug(tx, input.name);

    const organization = await tx.organization.create({
      data: {
        name: input.name,
        slug,
        country: input.country ?? "CI",
        currency: input.currency ?? "XOF",
        locale: input.locale ?? "fr",
        timezone: input.timezone ?? "Africa/Abidjan",
      },
    });

    await tx.membership.create({
      data: {
        userId: input.userId,
        organizationId: organization.id,
        role: "OWNER",
      },
    });

    await tx.auditLog.create({
      data: {
        organizationId: organization.id,
        actorUserId: input.userId,
        action: "organization.created",
        targetType: "Organization",
        targetId: organization.id,
      },
    });

    return organization;
  });
}

/** Liste les organisations auxquelles appartient un utilisateur (avec son rôle). */
export async function listUserOrganizations(userId: string) {
  return prisma.membership.findMany({
    where: { userId },
    include: { organization: true },
    orderBy: { createdAt: "asc" },
  });
}

export interface OrganizationSettingsInput {
  name: string;
  legalName: string | null;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  addressLine2: string | null;
  city: string | null;
  country: string;
  currency: string;
  timezone: string;
  locale: string;
  taxId: string | null;
  taxRegime: string | null;
  invoicePrefix: string;
  quotePrefix: string;
  brandColor: string | null;
}

const organizationSettingsSelect = {
  name: true,
  legalName: true,
  email: true,
  phone: true,
  addressLine1: true,
  addressLine2: true,
  city: true,
  country: true,
  currency: true,
  timezone: true,
  locale: true,
  taxId: true,
  taxRegime: true,
  invoicePrefix: true,
  quotePrefix: true,
  brandColor: true,
} satisfies Prisma.OrganizationSelect;

/** Lit uniquement les paramètres de l'organisation active. */
export async function getOrganizationSettings(ctx: AuthContext) {
  assertCan(ctx.role, "organization.view");
  return prisma.organization.findFirstOrThrow({
    where: { id: ctx.organizationId, deletedAt: null },
    select: organizationSettingsSelect,
  });
}

/** Met à jour l'organisation active et écrit la piste d'audit atomiquement. */
export async function updateOrganizationSettings(
  ctx: AuthContext,
  input: OrganizationSettingsInput,
) {
  assertCan(ctx.role, "organization.update");

  return prisma.$transaction(async (tx) => {
    const updated = await tx.organization.updateMany({
      where: { id: ctx.organizationId, deletedAt: null },
      data: input,
    });
    if (updated.count !== 1) throw new Error("Organisation active introuvable.");

    await tx.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        actorUserId: ctx.user.id,
        action: "organization.settings_updated",
        targetType: "Organization",
        targetId: ctx.organizationId,
      },
    });

    return tx.organization.findFirstOrThrow({
      where: { id: ctx.organizationId, deletedAt: null },
      select: organizationSettingsSelect,
    });
  });
}
