import { deleteOrganizations } from "@/server/database/test-cleanup";
import { describe, it, expect, beforeAll, afterAll, vi, beforeEach } from "vitest";
import type { MembershipRole } from "@prisma/client";
import { prisma } from "../database/client";
import type { AuthContext } from "../auth/context";
import { PermissionError, permissionsForRole } from "../permissions/permissions";
import { createOrganization } from "./organization-service";
import { createContact } from "./contact-service";
import { createQuote } from "./quote-service";
import * as invoiceService from "./invoice-service";
import * as contractService from "./contract-service";
import * as paymentService from "./payment-service";
import * as contractRepo from "../repositories/contract-repository";
import { createPayment } from "../repositories/payment-repository";
import { getInvoiceByToken } from "../repositories/invoice-repository";
import { getQuoteByPublicToken } from "../repositories/quote-repository";
import { getContactByPortalToken } from "../repositories/contact-repository";
import { getContractPdfForDownload, getInvoicePdfForDownload, invoiceVersion } from "./document-download";

/**
 * TESTS DE RÉGRESSION (intégration, base isolée) des blocages du pilote payant :
 * droits avant les PDF archivés, brouillons hors des liens publics, droit d'envoi
 * avant tout e-mail, PDF de la version courante, suppression des documents
 * engagés, confirmation de paiement atomique.
 */
const sent: { to: string; attachments: { content: Buffer }[] }[] = [];
vi.mock("@/server/integrations/email/mailer", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/integrations/email/mailer")>()),
  sendEmail: vi.fn(async (input: { to: string; attachments?: { content: Buffer }[] }) => {
    sent.push({ to: input.to, attachments: input.attachments ?? [] });
  }),
}));
let current: AuthContext;
vi.mock("@/server/auth/context", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/server/auth/context")>()),
  resolveSession: vi.fn(async () => ({ status: "ok", context: current })),
}));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("./notification-service", () => ({ notifyOrg: vi.fn().mockResolvedValue(undefined) }));

import { sendInvoiceAction } from "@/features/invoices/actions";
import { sendContractAction } from "@/features/contracts/actions";

const SUFFIX = "pilot-blockers";
let owner: AuthContext;
let orgId = "";
let contactId = "";

const as = (role: MembershipRole): AuthContext => ({ ...owner, role, permissions: permissionsForRole(role) });

async function draftInvoice() {
  const quote = await createQuote(owner, {
    contactId,
    items: [{ description: "Site vitrine", unitPriceMinor: 1_000_000, quantity: 1, taxRate: 0 }],
  });
  await prisma.quote.update({ where: { id: quote.id }, data: { status: "ACCEPTED" } });
  return invoiceService.generateFromQuote(owner, quote.id);
}

beforeAll(async () => {
  const user = await prisma.user.create({ data: { email: `owner-${SUFFIX}@test.local`, name: "Pilote", emailVerified: true } });
  await createOrganization({ userId: user.id, name: `Pilote ${SUFFIX}` });
  const org = await prisma.organization.findFirstOrThrow({ where: { memberships: { some: { userId: user.id } } } });
  orgId = org.id;
  owner = {
    user: { id: user.id, email: user.email, name: user.name, image: null },
    organizationId: org.id,
    organization: { id: org.id, name: org.name, slug: org.slug, currency: org.currency, locale: org.locale, timezone: org.timezone },
    role: "OWNER",
    permissions: permissionsForRole("OWNER"),
    impersonatedBy: null,
  };
  current = owner;
  const contact = await createContact(owner, {
    firstName: "Naya",
    lastName: "Client",
    email: `client-${SUFFIX}@example.test`,
    phone: undefined,
    companyName: "Maison Naya",
    source: undefined,
    notes: undefined,
    ownerId: undefined,
  });
  contactId = contact.id;
});

beforeEach(() => {
  sent.length = 0;
  current = owner;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { organizationId: orgId } });
  if (orgId) await deleteOrganizations({ id: orgId });
  await prisma.user.deleteMany({ where: { email: `owner-${SUFFIX}@test.local` } });
  await prisma.$disconnect();
});

describe("blocages du pilote payant", () => {
  it("une facture corrigée est renvoyée avec SON PDF, pas l'ancien", async () => {
    const invoice = await draftInvoice();
    expect(await sendInvoiceAction(invoice.id)).toEqual({ ok: true });
    const first = sent[0]!.attachments[0]!.content;

    await invoiceService.reopenInvoiceForCorrection(owner, invoice.id);
    await invoiceService.updateDraftInvoice(owner, invoice.id, {
      terms: "Nouvelles conditions",
      items: [{ description: "Site vitrine", unitPriceMinor: 1_400_000, quantity: 1, taxRate: 0 }],
    });
    expect(await sendInvoiceAction(invoice.id)).toEqual({ ok: true });
    const second = sent[1]!.attachments[0]!.content;

    expect(Buffer.compare(first, second)).not.toBe(0);
    // Le téléchargement sert l'archive de la version envoyée, octet pour octet.
    const download = await getInvoicePdfForDownload(owner, invoice.id);
    expect(Buffer.compare(download!.buffer, second)).toBe(0);
  });

  it("l'empreinte de version change avec les conditions, pas avec le paiement", async () => {
    const invoice = (await invoiceService.getInvoice(owner, (await draftInvoice()).id))!;
    const base = invoiceVersion(invoice).contentHash;
    expect(invoiceVersion({ ...invoice, terms: "Autre" }).contentHash).not.toBe(base);
    expect(invoiceVersion({ ...invoice, paidMinor: 500, status: "PAID" }).contentHash).toBe(base);
  });

  it("un rôle sans droit de lecture ne télécharge ni facture ni contrat archivés", async () => {
    const invoice = await draftInvoice();
    await sendInvoiceAction(invoice.id); // émise et archivée
    await expect(getInvoicePdfForDownload(as("COLLABORATOR"), invoice.id)).rejects.toBeInstanceOf(PermissionError);

    const contract = await contractRepo.createContract(orgId, { contactId, title: "Contrat", content: "Objet du contrat" });
    await expect(getContractPdfForDownload(as("COLLABORATOR"), contract.id)).rejects.toBeInstanceOf(PermissionError);

    // Une facture supprimée n'est plus servie, même archivée.
    await prisma.invoice.update({ where: { id: invoice.id }, data: { deletedAt: new Date() } });
    expect(await getInvoicePdfForDownload(owner, invoice.id)).toBeNull();
  });

  it("l'envoi exige le droit de modifier, avant tout e-mail", async () => {
    const invoice = await draftInvoice();
    current = as("SALES");
    expect(await sendInvoiceAction(invoice.id)).toEqual({ ok: false, error: "Permission insuffisante." });

    const contract = await contractRepo.createContract(orgId, { contactId, title: "Contrat", content: "Objet du contrat" });
    current = as("ACCOUNTANT");
    expect(await sendContractAction(contract.id)).toEqual({ ok: false, error: "Permission insuffisante." });

    expect(sent).toHaveLength(0);
    const fresh = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(fresh.status).toBe("DRAFT");
  });

  it("les brouillons restent hors des liens publics et du portail", async () => {
    const invoice = await draftInvoice();
    const quote = await createQuote(owner, { contactId, items: [{ description: "Brouillon", unitPriceMinor: 100, quantity: 1, taxRate: 0 }] });
    const contract = await contractRepo.createContract(orgId, { contactId, title: "Brouillon", content: "Texte" });
    const [inv, q, c] = await Promise.all([
      prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } }),
      prisma.quote.findUniqueOrThrow({ where: { id: quote.id } }),
      prisma.contact.findUniqueOrThrow({ where: { id: contactId } }),
    ]);
    expect(await getInvoiceByToken(inv.publicToken!)).toBeNull();
    expect(await getQuoteByPublicToken(q.publicToken!)).toBeNull();

    const portal = await getContactByPortalToken(c.portalToken!);
    expect(portal!.invoices.map((i) => i.id)).not.toContain(invoice.id);
    expect(portal!.quotes.map((x) => x.id)).not.toContain(quote.id);
    expect(portal!.contracts.map((x) => x.id)).not.toContain(contract.id);
  });

  it("une facture émise et un contrat envoyé ne se suppriment pas ; un brouillon si", async () => {
    const issued = await draftInvoice();
    await sendInvoiceAction(issued.id);
    await expect(invoiceService.deleteInvoice(owner, issued.id)).rejects.toBeInstanceOf(invoiceService.InvoiceError);

    const draft = await draftInvoice();
    await expect(invoiceService.deleteInvoice(owner, draft.id)).resolves.toBe(true);

    const contract = await contractRepo.createContract(orgId, { contactId, title: "Envoyé", content: "Texte" });
    await contractRepo.updateContractStatus(orgId, contract.id, "SENT", "DRAFT");
    await expect(contractService.deleteContract(owner, contract.id)).rejects.toBeInstanceOf(contractService.ContractError);
  });

  it("deux confirmations simultanées donnent le bon solde et le bon statut", async () => {
    const invoice = await draftInvoice();
    await prisma.invoice.update({ where: { id: invoice.id }, data: { status: "SENT" } });
    const a = await createPayment(orgId, { invoiceId: invoice.id, amountMinor: 400_000, method: "WAVE", declaredByClient: true });
    const b = await createPayment(orgId, { invoiceId: invoice.id, amountMinor: 600_000, method: "WAVE", declaredByClient: true });

    const results = await Promise.all([paymentService.confirmPayment(owner, a.id), paymentService.confirmPayment(owner, b.id)]);

    expect(results.every((r) => r.ok)).toBe(true);
    const fresh = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(fresh.paidMinor).toBe(1_000_000);
    expect(fresh.status).toBe("PAID");
  });
});
