import { describe, it, expect, beforeAll, afterAll, vi } from "vitest";
import type { Mock } from "vitest";
import { prisma } from "../database/client";
import type { AuthContext } from "../auth/context";
import { permissionsForRole } from "../permissions/permissions";
import { createOrganization } from "./organization-service";
import { createContact } from "./contact-service";
import { createQuote } from "./quote-service";
import * as contractService from "./contract-service";
import * as invoiceService from "./invoice-service";
import * as contractRepo from "../repositories/contract-repository";
import {
  respondToQuoteByToken,
  expireQuoteByTokenIfNeeded,
} from "../repositories/quote-repository";
import { recomputeInvoicePayment } from "../repositories/invoice-repository";
import { hashContractContent } from "@/lib/contracts/hash";
import { isInvoiceOverdue } from "@/lib/constants/invoices";

/**
 * TESTS DE RÉGRESSION (intégration, base isolée) des correctifs de signature
 * et de facturation. Prérequis : DATABASE_URL pointant une base de TEST dédiée.
 *
 * La notification d'organisation est moquée pour pouvoir simuler son échec sans
 * dépendre d'un SMTP.
 */
vi.mock("./notification-service", () => ({
  notifyOrg: vi.fn().mockResolvedValue(undefined),
}));
import { notifyOrg } from "./notification-service";
const notifyOrgMock = notifyOrg as unknown as Mock;

const SUFFIX = "reg-sig-bill";
let ctx: AuthContext;
let userId = "";
let orgId = "";
let contactId = "";

async function makeSentContract(content: string) {
  const contract = await contractRepo.createContract(orgId, {
    contactId,
    title: "Contrat régression",
    content,
  });
  await contractRepo.updateContractStatus(orgId, contract.id, "SENT", "DRAFT");
  const fresh = await prisma.contract.findUniqueOrThrow({ where: { id: contract.id } });
  return { id: contract.id, token: fresh.publicToken!, content };
}

async function makeAcceptedQuote(expiryDate: Date | null = null) {
  const quote = await createQuote(ctx, {
    contactId,
    expiryDate,
    items: [{ description: "Prestation", unitPriceMinor: 500_000, quantity: 1, taxRate: 18 }],
  });
  await prisma.quote.update({ where: { id: quote.id }, data: { status: "ACCEPTED" } });
  return quote;
}

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `owner-${SUFFIX}@test.local`, name: "Reg Owner", emailVerified: true },
  });
  userId = user.id;
  await createOrganization({ userId: user.id, name: `Reg ${SUFFIX}` });
  const org = await prisma.organization.findFirstOrThrow({
    where: { memberships: { some: { userId: user.id } } },
  });
  orgId = org.id;
  ctx = {
    user: { id: user.id, email: user.email, name: user.name, image: null },
    organizationId: org.id,
    organization: {
      id: org.id,
      name: org.name,
      slug: org.slug,
      currency: org.currency,
      locale: org.locale,
      timezone: org.timezone,
    },
    role: "OWNER",
    permissions: permissionsForRole("OWNER"),
    impersonatedBy: null,
  };
  const contact = await createContact(ctx, {
    firstName: "Client",
    lastName: "Reg",
    phone: undefined,
    companyName: undefined,
    source: undefined,
    notes: undefined,
    ownerId: undefined,
  });
  contactId = contact.id;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organizationId: orgId } });
  if (orgId) await prisma.organization.deleteMany({ where: { id: orgId } });
  if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("Signature de contrat — sécurité", () => {
  it("refuse la signature sans consentement explicite et n'écrit aucune preuve", async () => {
    const c = await makeSentContract("Contenu A sans consentement.");
    const result = await contractService.signContractByToken(c.token, {
      signerName: "Jean Client",
      consent: false,
      expectedContentHash: hashContractContent(c.content),
    });
    expect(result.ok).toBe(false);
    const row = await prisma.contract.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.status).toBe("SENT");
    const events = await prisma.signatureEvent.count({ where: { contractId: c.id } });
    expect(events).toBe(0);
  });

  it("refuse la signature si la version affichée est obsolète (empreinte différente)", async () => {
    const c = await makeSentContract("Version B originale.");
    const result = await contractService.signContractByToken(c.token, {
      signerName: "Jean Client",
      consent: true,
      expectedContentHash: hashContractContent("UNE AUTRE VERSION"),
    });
    expect(result.ok).toBe(false);
    const row = await prisma.contract.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.status).toBe("SENT");
    expect(row.signedAt).toBeNull();
  });

  it("empêche la double signature (une seule preuve conservée)", async () => {
    const c = await makeSentContract("Contenu à signer deux fois.");
    const hash = hashContractContent(c.content);
    const first = await contractService.signContractByToken(c.token, {
      signerName: "Jean Client",
      consent: true,
      expectedContentHash: hash,
    });
    const second = await contractService.signContractByToken(c.token, {
      signerName: "Jean Client",
      consent: true,
      expectedContentHash: hash,
    });
    expect(first.ok).toBe(true);
    expect(second.ok).toBe(false);
    const signedEvents = await prisma.signatureEvent.count({
      where: { contractId: c.id, type: "SIGNED" },
    });
    expect(signedEvents).toBe(1);
  });

  it("signature et correction concurrentes : issue cohérente (jamais signé ET rouvert)", async () => {
    const c = await makeSentContract("Contenu course concurrente.");
    const hash = hashContractContent(c.content);
    const [signResult, reopenOutcome] = await Promise.all([
      contractService.signContractByToken(c.token, {
        signerName: "Jean Client",
        consent: true,
        expectedContentHash: hash,
      }),
      contractService
        .reopenContractForCorrection(ctx, c.id)
        .then(() => ({ ok: true as const }))
        .catch(() => ({ ok: false as const })),
    ]);
    const row = await prisma.contract.findUniqueOrThrow({ where: { id: c.id } });
    // Exactement une des deux opérations a abouti.
    expect(signResult.ok !== reopenOutcome.ok).toBe(true);
    if (signResult.ok) {
      expect(row.status).toBe("SIGNED");
      expect(row.signedAt).not.toBeNull();
    } else {
      expect(row.status).toBe("DRAFT");
      expect(row.signedAt).toBeNull();
      // Pas d'événement SIGNED orphelin après réouverture.
      const signed = await prisma.signatureEvent.count({ where: { contractId: c.id, type: "SIGNED" } });
      expect(signed).toBe(0);
    }
  });

  it("la correction rotate le jeton public (l'ancien lien est révoqué)", async () => {
    const c = await makeSentContract("Contenu à corriger.");
    await contractService.reopenContractForCorrection(ctx, c.id);
    const row = await prisma.contract.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.status).toBe("DRAFT");
    expect(row.publicToken).not.toBe(c.token);
  });

  it("enregistre des preuves cohérentes avec le document final", async () => {
    const content = "Contenu final cohérent.";
    const c = await makeSentContract(content);
    const result = await contractService.signContractByToken(c.token, {
      signerName: "  Awa Diop  ",
      consent: true,
      expectedContentHash: hashContractContent(content),
    });
    expect(result.ok).toBe(true);
    const row = await prisma.contract.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.status).toBe("SIGNED");
    expect(row.signerName).toBe("Awa Diop");
    expect(row.contentHash).toBe(hashContractContent(content));
    const events = await prisma.signatureEvent.findMany({ where: { contractId: c.id } });
    const types = events.map((e) => e.type).sort();
    expect(types).toEqual(["CONSENT", "SIGNED"]);
  });

  it("l'échec de notification après signature ne fait pas échouer la signature", async () => {
    notifyOrgMock.mockRejectedValueOnce(new Error("SMTP indisponible"));
    const content = "Contenu notif échouée.";
    const c = await makeSentContract(content);
    const result = await contractService.signContractByToken(c.token, {
      signerName: "Client Notif",
      consent: true,
      expectedContentHash: hashContractContent(content),
    });
    expect(result.ok).toBe(true);
    const row = await prisma.contract.findUniqueOrThrow({ where: { id: c.id } });
    expect(row.status).toBe("SIGNED");
  });
});

describe("Devis — expiration à l'acceptation publique", () => {
  it("refuse l'acceptation d'un devis expiré, autorise le refus", async () => {
    const past = new Date(Date.now() - 86_400_000);
    const quote = await createQuote(ctx, {
      contactId,
      expiryDate: past,
      items: [{ description: "X", unitPriceMinor: 1000, quantity: 1, taxRate: 0 }],
    });
    const token = (await prisma.quote.findUniqueOrThrow({ where: { id: quote.id } })).publicToken!;
    await prisma.quote.update({ where: { id: quote.id }, data: { status: "SENT" } });

    const accepted = await respondToQuoteByToken(token, "ACCEPTED");
    expect(accepted).toBe(false);
    expect((await prisma.quote.findUniqueOrThrow({ where: { id: quote.id } })).status).toBe("SENT");

    const expired = await expireQuoteByTokenIfNeeded(token);
    expect(expired).toBe(true);
    expect((await prisma.quote.findUniqueOrThrow({ where: { id: quote.id } })).status).toBe("EXPIRED");
  });

  it("autorise l'acceptation d'un devis encore valide", async () => {
    const future = new Date(Date.now() + 86_400_000);
    const quote = await createQuote(ctx, {
      contactId,
      expiryDate: future,
      items: [{ description: "X", unitPriceMinor: 1000, quantity: 1, taxRate: 0 }],
    });
    const token = (await prisma.quote.findUniqueOrThrow({ where: { id: quote.id } })).publicToken!;
    await prisma.quote.update({ where: { id: quote.id }, data: { status: "SENT" } });
    expect(await respondToQuoteByToken(token, "ACCEPTED")).toBe(true);
    expect((await prisma.quote.findUniqueOrThrow({ where: { id: quote.id } })).status).toBe("ACCEPTED");
  });
});

describe("Facture — génération idempotente depuis un devis", () => {
  it("deux générations séquentielles renvoient la même facture", async () => {
    const quote = await makeAcceptedQuote();
    const a = await invoiceService.generateFromQuote(ctx, quote.id);
    const b = await invoiceService.generateFromQuote(ctx, quote.id);
    expect(a.id).toBe(b.id);
    const count = await prisma.invoice.count({ where: { organizationId: orgId, quoteId: quote.id } });
    expect(count).toBe(1);
  });

  it("deux générations concurrentes ne créent qu'une seule facture", async () => {
    const quote = await makeAcceptedQuote();
    const [a, b] = await Promise.all([
      invoiceService.generateFromQuote(ctx, quote.id),
      invoiceService.generateFromQuote(ctx, quote.id),
    ]);
    expect(a.id).toBe(b.id);
    const count = await prisma.invoice.count({ where: { organizationId: orgId, quoteId: quote.id } });
    expect(count).toBe(1);
  });
});

describe("Facture — retard dérivé (découplé du statut de paiement)", () => {
  it("une facture impayée échue reste SENT au recalcul, mais est marquée en retard (dérivé)", async () => {
    const quote = await makeAcceptedQuote();
    const invoice = await invoiceService.generateFromQuote(ctx, quote.id);
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "SENT", dueDate: new Date(Date.now() - 86_400_000) },
    });
    const recomputed = await recomputeInvoicePayment(orgId, invoice.id);
    // Le statut de paiement n'est PLUS écrasé par OVERDUE…
    expect(recomputed?.status).toBe("SENT");
    // …mais le retard est bien détecté de façon dérivée.
    expect(isInvoiceOverdue({ status: recomputed!.status, dueDate: recomputed!.dueDate })).toBe(true);
  });

  it("une facture PARTIELLEMENT payée ET échue : statut PARTIALLY_PAID + retard dérivé (coexistence)", async () => {
    const quote = await makeAcceptedQuote();
    const invoice = await invoiceService.generateFromQuote(ctx, quote.id);
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "SENT", dueDate: new Date(Date.now() - 86_400_000) },
    });
    // Encaissement partiel confirmé (moitié du total).
    await prisma.payment.create({
      data: {
        organizationId: orgId,
        invoiceId: invoice.id,
        amountMinor: Math.floor(invoice.totalMinor / 2),
        method: "CASH",
        status: "CONFIRMED",
      },
    });
    const recomputed = await recomputeInvoicePayment(orgId, invoice.id);
    expect(recomputed?.status).toBe("PARTIALLY_PAID");
    expect(recomputed?.paidMinor).toBeGreaterThan(0);
    expect(isInvoiceOverdue({ status: recomputed!.status, dueDate: recomputed!.dueDate })).toBe(true);
  });

  it("une facture impayée non échue n'est pas en retard", async () => {
    const quote = await makeAcceptedQuote();
    const invoice = await invoiceService.generateFromQuote(ctx, quote.id);
    await prisma.invoice.update({
      where: { id: invoice.id },
      data: { status: "SENT", dueDate: new Date(Date.now() + 86_400_000) },
    });
    const recomputed = await recomputeInvoicePayment(orgId, invoice.id);
    expect(recomputed?.status).toBe("SENT");
    expect(isInvoiceOverdue({ status: recomputed!.status, dueDate: recomputed!.dueDate })).toBe(false);
  });
});

describe("Contrats — modèles réutilisables & variables", () => {
  it("CRUD : création, lecture, mise à jour, duplication, archivage", async () => {
    const created = await contractService.createContractTemplate(ctx, {
      name: "Modèle prestation",
      body: "Contrat entre {{org_name}} et {{client_name}} — devis {{quote_number}}.",
    });
    expect(created.id).toBeTruthy();
    const fetched = await contractService.getContractTemplate(ctx, created.id);
    expect(fetched?.name).toBe("Modèle prestation");

    const updated = await contractService.updateContractTemplate(ctx, created.id, {
      name: "Modèle prestation v2",
      body: created.body,
    });
    expect(updated.name).toBe("Modèle prestation v2");

    const copy = await contractService.duplicateContractTemplate(ctx, created.id);
    expect(copy.name).toContain("(copie)");

    expect(await contractService.archiveContractTemplate(ctx, created.id)).toBe(true);
    const remaining = await contractService.listContractTemplates(ctx);
    expect(remaining.some((t) => t.id === created.id)).toBe(false);
  });

  it("génère un contrat à partir d'un modèle sélectionné (variables résolues)", async () => {
    const template = await contractService.createContractTemplate(ctx, {
      name: "Modèle OK",
      body: "Entre {{org_name}} et {{client_name}}. Montant {{total_ttc}}. Fait le {{date}}.",
    });
    const quote = await makeAcceptedQuote();
    const contract = await contractService.generateFromQuote(ctx, quote.id, { templateId: template.id });
    expect(contract.templateId).toBe(template.id);
    expect(contract.content).not.toContain("{{");
    expect(contract.content).toContain(ctx.organization.name);
  });

  it("bloque la génération si le modèle contient une variable inconnue (pas de vide silencieux)", async () => {
    const template = await contractService.createContractTemplate(ctx, {
      name: "Modèle variable inconnue",
      // {{client_adresse}} n'existe pas dans le catalogue.
      body: "Contrat {{org_name}} — {{client_adresse}}.",
    });
    const quote = await makeAcceptedQuote();
    await expect(
      contractService.generateFromQuote(ctx, quote.id, { templateId: template.id }),
    ).rejects.toThrow(/inconnue|non renseign/i);
  });
});
