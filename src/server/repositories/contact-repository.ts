import type { Prisma, ContactStage, ContactType } from "@prisma/client";
import { prisma } from "../database/client";

/**
 * Couche d'accès aux contacts — POINT D'ENFORCEMENT MULTI-TENANT.
 *
 * RÈGLE ABSOLUE : chaque fonction reçoit `organizationId` en premier argument
 * et l'inclut dans TOUTES les clauses `where`. Les mutations utilisent
 * updateMany/count scopés (id + organizationId), de sorte qu'une tentative
 * d'accès inter-organisation n'affecte jamais aucune ligne.
 *
 * Ce module ne fait AUCUN contrôle de permission (rôle) : c'est la
 * responsabilité de la couche service. Il ne fait pas non plus confiance à
 * l'appelant sur l'appartenance — le filtre organizationId est systématique.
 */

export interface ContactListParams {
  search?: string;
  stage?: ContactStage;
  type?: ContactType;
  ownerId?: string;
  page?: number;
  pageSize?: number;
}

export interface ContactCreateData {
  firstName: string;
  lastName?: string;
  email?: string;
  phone?: string;
  companyName?: string;
  source?: string;
  notes?: string;
  type?: ContactType;
  stage?: ContactStage;
  ownerId?: string;
}

export type ContactUpdateData = Partial<ContactCreateData>;

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function createContact(organizationId: string, data: ContactCreateData) {
  return prisma.contact.create({
    data: { ...data, organizationId },
  });
}

export async function listContacts(
  organizationId: string,
  params: ContactListParams = {},
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(MAX_PAGE_SIZE, Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE));

  const where: Prisma.ContactWhereInput = {
    organizationId,
    deletedAt: null,
  };
  if (params.stage) where.stage = params.stage;
  if (params.type) where.type = params.type;
  if (params.ownerId) where.ownerId = params.ownerId;
  if (params.search && params.search.trim() !== "") {
    const q = params.search.trim();
    where.OR = [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      { companyName: { contains: q, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.contact.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.contact.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export function getContactById(organizationId: string, id: string) {
  return prisma.contact.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: {
      owner: { select: { id: true, name: true, email: true } },
    },
  });
}

/** Met à jour un contact SI et seulement s'il appartient à l'organisation. */
export async function updateContact(
  organizationId: string,
  id: string,
  data: ContactUpdateData,
) {
  const result = await prisma.contact.updateMany({
    where: { id, organizationId, deletedAt: null },
    data,
  });
  if (result.count === 0) return null; // inexistant ou hors organisation
  return getContactById(organizationId, id);
}

/** Suppression logique scopée. Renvoie true si une ligne a été affectée. */
export async function softDeleteContact(organizationId: string, id: string) {
  const result = await prisma.contact.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count > 0;
}

export interface ActivityCreateData {
  contactId: string;
  type: Prisma.ContactActivityCreateInput["type"];
  content?: string;
  actorUserId?: string;
  metadata?: Prisma.InputJsonValue;
}

/** Ajoute une entrée d'historique à un contact (scopée à l'organisation). */
export function createActivity(
  organizationId: string,
  data: ActivityCreateData,
) {
  return prisma.contactActivity.create({
    data: {
      organizationId,
      contactId: data.contactId,
      type: data.type,
      content: data.content,
      actorUserId: data.actorUserId,
      metadata: data.metadata,
    },
  });
}

/** Historique d'un contact, du plus récent au plus ancien (scopé). */
export function listActivities(organizationId: string, contactId: string) {
  return prisma.contactActivity.findMany({
    where: { organizationId, contactId },
    orderBy: { createdAt: "desc" },
    include: { actor: { select: { id: true, name: true } } },
  });
}

/** Compte les contacts par étape de pipeline (pour le CRM et le dashboard). */
export async function countByStage(organizationId: string) {
  const rows = await prisma.contact.groupBy({
    by: ["stage"],
    where: { organizationId, deletedAt: null },
    _count: { _all: true },
  });
  return rows.map((r) => ({ stage: r.stage, count: r._count._all }));
}
