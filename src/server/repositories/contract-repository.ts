import { randomBytes } from "node:crypto";
import type { Prisma, ContractStatus, SignatureEventType } from "@prisma/client";
import { prisma } from "../database/client";

/**
 * Couche d'accès aux contrats — enforcement multi-tenant (organizationId
 * systématique). Les fonctions "par jeton" (signature côté client) ne sont pas
 * scopées : le jeton public est le secret d'accès.
 */

export interface ContractCreateData {
  contactId: string;
  quoteId?: string | null;
  templateId?: string | null;
  title: string;
  content: string;
  createdById?: string;
}

export interface ContractListParams {
  status?: ContractStatus;
  search?: string;
  page?: number;
  pageSize?: number;
}

const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export async function createContract(
  organizationId: string,
  data: ContractCreateData,
) {
  return prisma.$transaction(async (tx) => {
    const count = await tx.contract.count({ where: { organizationId } });
    const year = new Date().getFullYear();
    const number = `CTR-${year}-${String(count + 1).padStart(4, "0")}`;

    return tx.contract.create({
      data: {
        organizationId,
        contactId: data.contactId,
        quoteId: data.quoteId ?? null,
        templateId: data.templateId ?? null,
        number,
        title: data.title,
        content: data.content,
        publicToken: randomBytes(24).toString("hex"),
        createdById: data.createdById,
        events: {
          create: {
            organizationId,
            type: "VIEWED",
            actorName: "système",
            metadata: { note: "Contrat généré" },
          },
        },
      },
      include: { events: true },
    });
  });
}

export async function listContracts(
  organizationId: string,
  params: ContractListParams = {},
) {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE),
  );

  const where: Prisma.ContractWhereInput = { organizationId, deletedAt: null };
  if (params.status) where.status = params.status;
  if (params.search && params.search.trim() !== "") {
    where.number = { contains: params.search.trim(), mode: "insensitive" };
  }

  const [items, total] = await Promise.all([
    prisma.contract.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        contact: { select: { firstName: true, lastName: true, companyName: true } },
      },
    }),
    prisma.contract.count({ where }),
  ]);

  return { items, total, page, pageSize };
}

export function getContractById(organizationId: string, id: string) {
  return prisma.contract.findFirst({
    where: { id, organizationId, deletedAt: null },
    include: {
      contact: { select: { firstName: true, lastName: true, companyName: true, email: true } },
      quote: { select: { number: true } },
      events: { orderBy: { createdAt: "desc" } },
    },
  });
}

export async function updateContractStatus(
  organizationId: string,
  id: string,
  status: ContractStatus,
) {
  const result = await prisma.contract.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: { status },
  });
  if (result.count === 0) return null;
  return getContractById(organizationId, id);
}

export async function softDeleteContract(organizationId: string, id: string) {
  const result = await prisma.contract.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count > 0;
}

// --- Accès public par jeton (signature côté client) -------------------------

export function getContractByToken(token: string) {
  return prisma.contract.findFirst({
    where: { publicToken: token, deletedAt: null },
    include: {
      contact: { select: { firstName: true, lastName: true, companyName: true, email: true } },
      organization: { select: { name: true, locale: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}

export interface SignatureProof {
  signerName: string;
  signerEmail?: string | null;
  signerIp?: string | null;
  contentHash: string;
}

/**
 * Enregistre la signature : ne réussit que si le contrat est en attente (SENT).
 * Renvoie true si la signature a été appliquée.
 */
export async function markContractSigned(token: string, proof: SignatureProof) {
  const result = await prisma.contract.updateMany({
    where: { publicToken: token, status: "SENT", deletedAt: null },
    data: {
      status: "SIGNED",
      signedAt: new Date(),
      signerName: proof.signerName,
      signerEmail: proof.signerEmail ?? null,
      signerIp: proof.signerIp ?? null,
      contentHash: proof.contentHash,
    },
  });
  return result.count > 0;
}

export function createSignatureEvent(
  organizationId: string,
  data: {
    contractId: string;
    type: SignatureEventType;
    actorName?: string;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Prisma.InputJsonValue;
  },
) {
  return prisma.signatureEvent.create({
    data: {
      organizationId,
      contractId: data.contractId,
      type: data.type,
      actorName: data.actorName,
      ipAddress: data.ipAddress,
      userAgent: data.userAgent,
      metadata: data.metadata,
    },
  });
}
