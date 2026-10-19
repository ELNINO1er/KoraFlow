import "server-only";
import type { ContractStatus } from "@prisma/client";
import type { AuthContext } from "../auth/context";
import { assertCan } from "../permissions/permissions";
import { prisma } from "../database/client";
import * as contracts from "../repositories/contract-repository";
import { getQuoteById } from "../repositories/quote-repository";
import { resolveTemplate, unresolvedVariablesMessage } from "@/lib/contracts/variables";
import { hashContractContent } from "@/lib/contracts/hash";
import * as templates from "../repositories/contract-template-repository";
import { listArchivesForDocument } from "../repositories/document-archive-repository";
import { formatCurrency } from "@/lib/formatting/currency";
import { notifyOrg } from "./notification-service";

export class ContractError extends Error {}

/** Texte de consentement journalisé avec la signature. */
const CONSENT_STATEMENT =
  "Le signataire déclare avoir lu le contrat affiché et en accepter les termes.";

/** Modèle par défaut utilisé quand aucun modèle personnalisé n'est fourni. */
const DEFAULT_TEMPLATE = `CONTRAT DE PRESTATION DE SERVICES

Entre {{org_name}} (le Prestataire)
et {{client_name}} (le Client).

Objet : le présent contrat fait suite au devis {{quote_number}} accepté par le Client.
Montant total : {{total_ttc}} TTC.

Le Client reconnaît avoir pris connaissance des prestations décrites dans le devis
{{quote_number}} et en accepter les termes.

Fait le {{date}}.`;

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

/** Versions archivées (figées) d'un contrat, pour consultation/téléchargement. */
export async function listContractArchives(ctx: AuthContext, contractId: string) {
  assertCan(ctx.role, "contracts.view");
  return listArchivesForDocument({
    organizationId: ctx.organizationId,
    documentType: "CONTRACT",
    documentId: contractId,
  });
}

export async function updateDraftContract(
  ctx: AuthContext,
  id: string,
  input: { title: string; content: string },
) {
  assertCan(ctx.role, "contracts.update");
  const updated = await contracts.updateDraftContract(ctx.organizationId, id, input);
  if (!updated) {
    throw new ContractError("Seul un contrat brouillon peut être modifié.");
  }
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      action: "contract.updated",
      targetType: "Contract",
      targetId: id,
      metadata: { title: input.title, characterCount: input.content.length },
    },
  });
  return updated;
}

export async function reopenContractForCorrection(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "contracts.update");
  const current = await contracts.getContractById(ctx.organizationId, id);
  if (!current) throw new ContractError("Contrat introuvable.");
  if (current.status !== "SENT") {
    throw new ContractError("Seul un contrat en attente de signature peut être corrigé.");
  }
  // Réouverture ATOMIQUE : échoue si une signature est arrivée entre-temps
  // (le statut n'est plus SENT). Le jeton public est rotaté dans la foulée.
  const updated = await contracts.reopenContractToDraft(ctx.organizationId, id);
  if (!updated) {
    throw new ContractError(
      "Le contrat a déjà été signé ou traité : il ne peut plus être corrigé.",
    );
  }
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      action: "contract.reopened_for_correction",
      targetType: "Contract",
      targetId: id,
      metadata: { previousStatus: current.status },
    },
  });
  return updated;
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

  // Corps : modèle sélectionné (scopé org) > corps explicite > modèle par défaut.
  let templateBody = opts?.templateBody ?? DEFAULT_TEMPLATE;
  const templateId = opts?.templateId ?? null;
  if (templateId) {
    const template = await templates.getContractTemplateById(ctx.organizationId, templateId);
    if (!template) throw new ContractError("Modèle de contrat introuvable.");
    templateBody = template.body;
  }

  const resolution = resolveTemplate(templateBody, {
    org_name: ctx.organization.name,
    client_name: clientName,
    quote_number: quote.number,
    total_ttc: formatCurrency(quote.totalMinor, quote.currency, localeTag),
    date: new Intl.DateTimeFormat(localeTag, { dateStyle: "long" }).format(new Date()),
  });
  // Aucune substitution silencieuse : on bloque si une variable est inconnue ou
  // non renseignée (le message liste précisément les variables en cause).
  const unresolved = unresolvedVariablesMessage(resolution);
  if (unresolved) throw new ContractError(unresolved);

  const contract = await contracts.createContract(ctx.organizationId, {
    contactId: quote.contactId,
    quoteId: quote.id,
    templateId,
    title: opts?.title ?? `Contrat — ${quote.number}`,
    content: resolution.text,
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
  const current = await contracts.getContractById(ctx.organizationId, id);
  if (!current) return null;
  if (current.status === status) return current;
  const allowed =
    (current.status === "DRAFT" && (status === "SENT" || status === "CANCELED")) ||
    (current.status === "SENT" && status === "CANCELED");
  if (!allowed) {
    throw new ContractError(
      status === "SIGNED"
        ? "La signature doit être réalisée par le client depuis son lien sécurisé."
        : "Cette transition de statut n’est pas autorisée.",
    );
  }
  // Transition conditionnée au statut lu : une signature concurrente ne peut
  // pas être écrasée (updateMany ne touche rien si le statut a changé).
  const updated = await contracts.updateContractStatus(
    ctx.organizationId,
    id,
    status,
    current.status,
  );
  if (!updated) {
    throw new ContractError(
      "Le statut du contrat a changé entre-temps. Rechargez la page et réessayez.",
    );
  }
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

// --- Modèles de contrat réutilisables ---------------------------------------

export async function listContractTemplates(ctx: AuthContext, includeArchived = false) {
  assertCan(ctx.role, "contracts.view");
  return templates.listContractTemplates(ctx.organizationId, includeArchived);
}

export async function getContractTemplate(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "contracts.view");
  return templates.getContractTemplateById(ctx.organizationId, id);
}

export async function createContractTemplate(
  ctx: AuthContext,
  input: { name: string; body: string },
) {
  assertCan(ctx.role, "contracts.create");
  const created = await templates.createContractTemplate(ctx.organizationId, input);
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      action: "contract_template.created",
      targetType: "ContractTemplate",
      targetId: created.id,
      metadata: { name: created.name },
    },
  });
  return created;
}

export async function updateContractTemplate(
  ctx: AuthContext,
  id: string,
  input: { name: string; body: string },
) {
  assertCan(ctx.role, "contracts.update");
  const updated = await templates.updateContractTemplate(ctx.organizationId, id, input);
  if (!updated) throw new ContractError("Modèle introuvable.");
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      action: "contract_template.updated",
      targetType: "ContractTemplate",
      targetId: id,
      metadata: { name: updated.name },
    },
  });
  return updated;
}

export async function duplicateContractTemplate(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "contracts.create");
  const copy = await templates.duplicateContractTemplate(ctx.organizationId, id);
  if (!copy) throw new ContractError("Modèle introuvable.");
  return copy;
}

export async function archiveContractTemplate(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "contracts.delete");
  const ok = await templates.archiveContractTemplate(ctx.organizationId, id);
  if (!ok) throw new ContractError("Modèle introuvable.");
  return ok;
}

// --- Signature côté client (public, via jeton — pas de contexte auth) --------

export interface SignInput {
  signerName: string;
  /** Consentement explicite transmis depuis le formulaire (coché par le client). */
  consent: boolean;
  /** Empreinte SHA-256 de la version EXACTE affichée au client au moment de signer. */
  expectedContentHash: string;
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
  // Consentement EXIGÉ côté serveur : une invocation directe de l'action sans
  // avoir coché la case ne peut pas enregistrer de consentement.
  if (input.consent !== true) {
    return {
      ok: false as const,
      error: "Vous devez accepter explicitement les termes du contrat pour le signer.",
    };
  }

  // L'empreinte porte sur le contenu EXACT en base ; elle doit correspondre à
  // la version que le client a affichée. Toute divergence (contrat corrigé puis
  // renvoyé entre-temps) fait échouer la signature et impose une relecture.
  const currentHash = hashContractContent(contract.content);
  if (input.expectedContentHash !== currentHash) {
    return {
      ok: false as const,
      error:
        "Le contrat a été modifié depuis votre dernière consultation. Veuillez recharger la page et le relire avant de signer.",
    };
  }

  // Signature + preuves (consentement, empreinte) + audit : UNE transaction.
  const signed = await contracts.recordSignature(
    contract.organizationId,
    contract.id,
    token,
    {
      signerName: input.signerName.trim(),
      // E-mail du DESTINATAIRE du lien (fiche contact) — non vérifié auprès du
      // signataire. Stocké à titre de contexte, jamais présenté comme preuve
      // d'identité.
      linkRecipientEmail: contract.contact.email,
      signerIp: input.ipAddress ?? null,
      userAgent: input.userAgent ?? null,
      contentHash: currentHash,
      consentText: CONSENT_STATEMENT,
    },
  );
  if (!signed) {
    return { ok: false as const, error: "Signature impossible (contrat déjà traité)." };
  }

  // Notification APRÈS commit : son échec ne doit pas faire croire que la
  // signature a échoué (elle est bien enregistrée).
  try {
    await notifyOrg(
      contract.organizationId,
      {
        type: "contract.signed",
        title: `Contrat ${contract.number} signé`,
        body: input.signerName.trim(),
        link: `/contrats/${contract.id}`,
      },
      { email: true },
    );
  } catch (error) {
    console.warn("contract.signed_notification_failed", {
      contractId: contract.id,
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  return { ok: true as const, contractId: contract.id };
}
