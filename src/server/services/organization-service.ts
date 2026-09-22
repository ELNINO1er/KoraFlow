import "server-only";
import type { Prisma } from "@prisma/client";
import { prisma } from "../database/client";
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
