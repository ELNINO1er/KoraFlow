import type { Prisma } from "@prisma/client";
import { prisma } from "./client";

/**
 * Nettoyage des tests. MySQL applique le RESTRICT des contacts pendant la cascade
 * depuis l'organisation : on retire d'abord les documents qui les référencent.
 */
export async function deleteOrganizations(where: Prisma.OrganizationWhereInput) {
  const organizations = await prisma.organization.findMany({ where, select: { id: true } });
  const scope = { organizationId: { in: organizations.map((o) => o.id) } };
  await prisma.project.deleteMany({ where: scope });
  await prisma.invoice.deleteMany({ where: scope });
  await prisma.contract.deleteMany({ where: scope });
  await prisma.quote.deleteMany({ where: scope });
  await prisma.organization.deleteMany({ where });
}
