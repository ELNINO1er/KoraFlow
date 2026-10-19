import { randomBytes } from "node:crypto";
import type { Prisma, ContractStatus, SignatureEventType } from "@prisma/client";
import { prisma } from "../database/client";
import { nextDocumentSequence } from "./document-sequence-repository";

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
    const year = new Date().getFullYear();
    const sequence = await nextDocumentSequence(tx, organizationId, "CONTRACT", year);
    const number = `CTR-${year}-${String(sequence).padStart(4, "0")}`;

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

/**
 * Transition de statut atomique. Si `expectedStatus` est fourni, l'écriture
 * n'a lieu que si le contrat est ENCORE dans cet état (garde optimiste) : une
 * transition concurrente (p. ex. une signature qui arrive entre la lecture et
 * l'écriture) ne peut donc pas être écrasée. Renvoie null si rien n'a changé.
 */
export async function updateContractStatus(
  organizationId: string,
  id: string,
  status: ContractStatus,
  expectedStatus?: ContractStatus,
) {
  const result = await prisma.contract.updateMany({
    where: {
      id,
      organizationId,
      deletedAt: null,
      ...(expectedStatus ? { status: expectedStatus } : {}),
    },
    data: { status },
  });
  if (result.count === 0) return null;
  return getContractById(organizationId, id);
}

/**
 * Rouvre un contrat en brouillon pour correction, de façon ATOMIQUE et
 * uniquement s'il est toujours en attente de signature (`SENT`). Le jeton public
 * est simultanément ROTATÉ : l'ancien lien de signature est révoqué pour éviter
 * qu'il réactive un contenu modifié. Si une signature est arrivée entre-temps
 * (statut devenu `SIGNED`), aucune ligne n'est touchée et null est renvoyé.
 */
export async function reopenContractToDraft(organizationId: string, id: string) {
  const result = await prisma.contract.updateMany({
    where: { id, organizationId, status: "SENT", deletedAt: null },
    data: { status: "DRAFT", publicToken: randomBytes(24).toString("hex") },
  });
  if (result.count === 0) return null;
  return getContractById(organizationId, id);
}

export async function updateDraftContract(
  organizationId: string,
  id: string,
  data: { title: string; content: string },
) {
  const result = await prisma.contract.updateMany({
    where: { id, organizationId, status: "DRAFT", deletedAt: null },
    data: { title: data.title, content: data.content },
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
      organization: { select: { id: true, name: true, logoUrl: true, locale: true } },
      events: { orderBy: { createdAt: "asc" } },
    },
  });
}

export interface SignatureProof {
  signerName: string;
  /** Adresse à laquelle le lien de signature a été transmis (non vérifiée). */
  linkRecipientEmail?: string | null;
  signerIp?: string | null;
  userAgent?: string | null;
  contentHash: string;
  consentText: string;
}

/**
 * Enregistre la signature et TOUTES ses preuves obligatoires dans UNE SEULE
 * transaction cohérente :
 *   1. bascule atomique `SENT → SIGNED` (conditionnelle : échoue si le contrat
 *      a été rouvert/corrigé ou déjà signé entre-temps) ;
 *   2. événement `CONSENT` (consentement explicite horodaté) ;
 *   3. événement `SIGNED` (empreinte du contenu signé) ;
 *   4. entrée du journal d'audit.
 *
 * Si la bascule ne touche aucune ligne, la transaction est annulée et aucun
 * événement/preuve orphelin n'est écrit. Renvoie true si la signature a été
 * appliquée.
 */
export async function recordSignature(
  organizationId: string,
  contractId: string,
  token: string,
  proof: SignatureProof,
): Promise<boolean> {
  return prisma.$transaction(async (tx) => {
    const applied = await tx.contract.updateMany({
      where: { id: contractId, publicToken: token, organizationId, status: "SENT", deletedAt: null },
      data: {
        status: "SIGNED",
        signedAt: new Date(),
        signerName: proof.signerName,
        signerEmail: proof.linkRecipientEmail ?? null,
        signerIp: proof.signerIp ?? null,
        contentHash: proof.contentHash,
      },
    });
    if (applied.count === 0) return false;

    await tx.signatureEvent.create({
      data: {
        organizationId,
        contractId,
        type: "CONSENT",
        actorName: proof.signerName,
        ipAddress: proof.signerIp ?? undefined,
        userAgent: proof.userAgent ?? undefined,
        metadata: { consent: proof.consentText, contentHash: proof.contentHash },
      },
    });
    await tx.signatureEvent.create({
      data: {
        organizationId,
        contractId,
        type: "SIGNED",
        actorName: proof.signerName,
        ipAddress: proof.signerIp ?? undefined,
        userAgent: proof.userAgent ?? undefined,
        metadata: { contentHash: proof.contentHash, algorithm: "SHA-256" },
      },
    });
    await tx.auditLog.create({
      data: {
        organizationId,
        action: "contract.signed_by_client",
        targetType: "Contract",
        targetId: contractId,
        metadata: { contentHash: proof.contentHash },
      },
    });
    return true;
  });
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
