import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { prisma } from "./database/client";
import type { AuthContext } from "./auth/context";
import { permissionsForRole } from "./permissions/permissions";
import { createOrganization } from "./services/organization-service";
import { createContact } from "./services/contact-service";
import { createService } from "./services/catalog-service";
import { createQuote, changeQuoteStatus } from "./services/quote-service";
import {
  generateFromQuote as generateContract,
  changeContractStatus,
  signContractByToken,
} from "./services/contract-service";
import {
  generateFromQuote as generateInvoice,
  changeInvoiceStatus,
} from "./services/invoice-service";
import { declarePaymentByToken, confirmPayment } from "./services/payment-service";
import { hashContractContent } from "@/lib/contracts/hash";

/**
 * Test END-TO-END du parcours commercial, à travers les VRAIS services :
 * Prospect → Devis → (accepté) → Contrat → (signé) → Facture → (envoyée)
 * → Paiement déclaré par le client → validé par un responsable
 * → Facture PAYÉE → Projet créé automatiquement.
 */
const SUFFIX = "e2e-flow";
let userId = "";
let orgId = "";
let ctx: AuthContext;

beforeAll(async () => {
  const user = await prisma.user.create({
    data: { email: `owner-${SUFFIX}@test.local`, name: "E2E Owner", emailVerified: true },
  });
  userId = user.id;

  await createOrganization({ userId: user.id, name: `E2E Flow ${SUFFIX}` });
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
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { actorUserId: userId } });
  if (orgId) await prisma.organization.deleteMany({ where: { id: orgId } });
  if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("Parcours commercial de bout en bout", () => {
  it("enchaîne prospect → devis → contrat → facture → paiement → projet auto", async () => {
    // 1. Prospect
    const contact = await createContact(ctx, {
      firstName: "Client",
      lastName: "E2E",
      phone: undefined,
      companyName: undefined,
      source: undefined,
      notes: undefined,
      ownerId: undefined,
    });
    expect(contact.id).toBeTruthy();

    // 2. Service au catalogue
    const service = await createService(ctx, {
      name: "Prestation E2E",
      priceMinor: 1_000_000,
      unit: "forfait",
      taxRate: 18,
    });
    expect(service.id).toBeTruthy();

    // 3. Devis (1 ligne depuis le service)
    const quote = await createQuote(ctx, {
      contactId: contact.id,
      items: [
        {
          serviceId: service.id,
          description: "Prestation E2E",
          unitPriceMinor: 1_000_000,
          quantity: 1,
          taxRate: 18,
        },
      ],
    });
    expect(quote.totalMinor).toBeGreaterThan(0);

    // 4. Devis accepté par le client
    await changeQuoteStatus(ctx, quote.id, "ACCEPTED");
    expect((await prisma.quote.findUnique({ where: { id: quote.id } }))?.status).toBe("ACCEPTED");

    // 5. Contrat généré depuis le devis accepté
    const contract = await generateContract(ctx, quote.id);
    expect(contract.id).toBeTruthy();

    // 6. Contrat signé (consentement explicite + empreinte de la version affichée)
    await changeContractStatus(ctx, contract.id, "SENT");
    const signed = await signContractByToken(contract.publicToken!, {
      signerName: "Client E2E",
      consent: true,
      expectedContentHash: hashContractContent(contract.content),
    });
    expect(signed.ok).toBe(true);
    expect((await prisma.contract.findUnique({ where: { id: contract.id } }))?.status).toBe("SIGNED");

    // 7. Facture générée + envoyée
    const invoice = await generateInvoice(ctx, quote.id);
    await changeInvoiceStatus(ctx, invoice.id, "SENT");
    const invoiceRow = await prisma.invoice.findUniqueOrThrow({ where: { id: invoice.id } });
    expect(invoiceRow.publicToken).toBeTruthy();
    expect(invoiceRow.status).toBe("SENT");

    // 8. Le CLIENT déclare le paiement (via le jeton public)
    const declared = await declarePaymentByToken(invoiceRow.publicToken!, {
      amountMinor: invoiceRow.totalMinor,
      method: "WAVE",
    });
    expect(declared.ok).toBe(true);

    const pending = await prisma.payment.findFirstOrThrow({
      where: { invoiceId: invoice.id, status: "PENDING" },
    });
    expect(pending.declaredByClient).toBe(true);

    // 9. Un responsable VALIDE le paiement
    const confirmed = await confirmPayment(ctx, pending.id);
    expect(confirmed.ok).toBe(true);

    // 10. Facture PAYÉE
    expect((await prisma.invoice.findUnique({ where: { id: invoice.id } }))?.status).toBe("PAID");

    // 11. Projet CRÉÉ AUTOMATIQUEMENT pour cette facture
    const project = await prisma.project.findFirst({ where: { invoiceId: invoice.id } });
    expect(project).not.toBeNull();
    expect(project?.contactId).toBe(contact.id);
  });
});
