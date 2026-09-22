import { describe, it, expect } from "vitest";
import { renderToBuffer } from "@react-pdf/renderer";
import { QuoteDocument, type QuotePdfData } from "./quote-document";

const sample: QuotePdfData = {
  org: { name: "Agence Démo", email: "contact@demo.test", city: "Abidjan", country: "CI" },
  contact: { name: "Aminata Traoré", email: "aminata@baobab.ci" },
  number: "DEV-2026-0001",
  issueDate: new Date("2026-09-22T00:00:00Z"),
  expiryDate: null,
  currency: "XOF",
  locale: "fr-FR",
  items: [
    { description: "Développement site web", quantity: 1, unitPriceMinor: 850000, taxRate: 18 },
  ],
  subtotalMinor: 850000,
  discountMinor: 0,
  taxMinor: 153000,
  totalMinor: 1003000,
  depositMinor: 300900,
  notes: "Merci de votre confiance.",
};

describe("génération du PDF de devis", () => {
  it("produit un buffer PDF valide", async () => {
    // On appelle le composant directement pour éviter le JSX dans un .test.ts.
    const buffer = await renderToBuffer(
      QuoteDocument({ data: sample }) as Parameters<typeof renderToBuffer>[0],
    );
    expect(buffer.length).toBeGreaterThan(1000);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
  });
});
