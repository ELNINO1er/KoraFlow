import "server-only";
import { createHash } from "node:crypto";
import type { ContractStatus } from "@prisma/client";
import type { AuthContext } from "../auth/context";
import { assertCan } from "../permissions/permissions";
import { prisma } from "../database/client";
import * as contracts from "../repositories/contract-repository";
import { getQuoteById } from "../repositories/quote-repository";
import { renderTemplate } from "@/lib/contracts/render";
import { formatCurrency } from "@/lib/formatting/currency";
import { notifyOrg } from "./notification-service";

export class ContractError extends Error {}

/** Modèle par défaut utilisé quand aucun modèle personnalisé n'est fourni. */
const DEFAULT_TEMPLATE = `CONTRAT DE PRESTATION DE SERVICES

Entre {{org_name}} (le Prestataire)
et {{client_name}} (le Client).

Objet : le présent contrat fait suite au devis {{quote_number}} accepté par le Client.
Montant total : {{total_ttc}} TTC.

Le Client reconnaît avoir pris connaissance des prestations décrites dans le devis
{{quote_number}} et en accepter les termes.

Fait le {{date}}.`;

/** Calcule l'empreinte SHA-256 du contenu exact (preuve d'intégrité). */
function sha256(content: string): string {
  return createHash("sha256").update(content, "utf8").digest("hex");
}

export async function listContracts(
  ctx: AuthContext,
  params: contracts.ContractListParams,
) {
  assertCan(ctx.role, "contracts.view");
  return contracts.listContracts(ctx.organizationId, params);
}

export async function getContract(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "contracts.view");
  return contracts.getContractById(ctx.organizationId, id);
}

/** Génère un contrat à partir d'un devis ACCEPTÉ. */
export async function generateFromQuote(
  ctx: AuthContext,
  quoteId: string,
  opts?: { templateBody?: string; templateId?: string; title?: string },
) {
  assertCan(ctx.role, "contracts.create");

  const quote = await getQuoteById(ctx.organizationId, quoteId);
  if (!quote) throw new ContractError("Devis introuvable.");
  if (quote.status !== "ACCEPTED") {
    throw new ContractError(
      "Le devis doit être accepté par le client avant de générer un contrat.",
    );
  }

  const localeTag =
    ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const clientName = quote.contact.companyName
    ? quote.contact.companyName
    : `${quote.contact.firstName} ${quote.contact.lastName ?? ""}`.trim();

  const content = renderTemplate(opts?.templateBody ?? DEFAULT_TEMPLATE, {
    org_name: ctx.organization.name,
    client_name: clientName,
    quote_number: quote.number,
    total_ttc: formatCurrency(quote.totalMinor, quote.currency, localeTag),
    date: new Intl.DateTimeFormat(localeTag, { dateStyle: "long" }).format(new Date()),
  });

  const contract = await contracts.createContract(ctx.organizationId, {
    contactId: quote.contactId,
    quoteId: quote.id,
    templateId: opts?.templateId ?? null,
    title: opts?.title ?? `Contrat — ${quote.number}`,
    content,
    createdById: ctx.user.id,
  });

  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      action: "contract.created",
      targetType: "Contract",
      targetId: contract.id,
      metadata: { number: contract.number, quoteId: quote.id },
    },
  });

  return contract;
}

export async function changeContractStatus(
  ctx: AuthContext,
  id: string,
  status: ContractStatus,
) {
  assertCan(ctx.role, "contracts.update");
  const updated = await contracts.updateContractStatus(ctx.organizationId, id, status);
  if (updated) {
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        actorUserId: ctx.user.id,
        action: "contract.status_changed",
        targetType: "Contract",
        targetId: id,
        metadata: { status },
      },
    });
  }
  return updated;
}

export async function deleteContract(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "contracts.delete");
  return contracts.softDeleteContract(ctx.organizationId, id);
}

// --- Signature côté client (public, via jeton — pas de contexte auth) --------

export interface SignInput {
  signerName: string;
  ipAddress?: string;
  userAgent?: string;
}

export async function signContractByToken(token: string, input: SignInput) {
  const contract = await contracts.getContractByToken(token);
  if (!contract) return { ok: false as const, error: "Contrat introuvable." };
  if (contract.status !== "SENT") {
    return { ok: false as const, error: "Ce contrat n'est pas en attente de signature." };
  }
  if (input.signerName.trim().length < 2) {
    return { ok: false as const, error: "Veuillez saisir votre nom complet." };
  }

  // L'empreinte porte sur le contenu EXACT tel qu'affiché et signé.
  const contentHash = sha256(contract.content);

  // Consentement explicite journalisé avant la signature.
  await contracts.createSignatureEvent(contract.organizationId, {
    contractId: contract.id,
    type: "CONSENT",
    actorName: input.signerName,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { consent: "Le signataire déclare accepter les termes du contrat." },
  });

  const signed = await contracts.markContractSigned(token, {
    signerName: input.signerName.trim(),
    signerEmail: contract.contact.email,
    signerIp: input.ipAddress ?? null,
    contentHash,
  });
  if (!signed) {
    return { ok: false as const, error: "Signature impossible (contrat déjà traité)." };
  }

  await contracts.createSignatureEvent(contract.organizationId, {
    contractId: contract.id,
    type: "SIGNED",
    actorName: input.signerName,
    ipAddress: input.ipAddress,
    userAgent: input.userAgent,
    metadata: { contentHash, algorithm: "SHA-256" },
  });

  await prisma.auditLog.create({
    data: {
      organizationId: contract.organizationId,
      action: "contract.signed_by_client",
      targetType: "Contract",
      targetId: contract.id,
      metadata: { contentHash },
    },
  });
  await notifyOrg(
    contract.organizationId,
    {
      type: "contract.signed",
      title: `Contrat ${contract.number} signé`,
      body: input.signerName,
      link: `/contrats/${contract.id}`,
    },
    { email: true },
  );

  return { ok: true as const, contractId: contract.id };
}
