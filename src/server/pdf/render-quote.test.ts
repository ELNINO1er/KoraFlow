import { describe, it, expect } from "vitest";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument } from "pdf-lib";
import { renderQuotePdf, type QuotePdfData } from "./render-quote";

const sample: QuotePdfData = {
  org: { name: "Agence Démo", email: "contact@demo.test", city: "Abidjan", country: "CI" },
  contact: { name: "Aminata Traoré", email: "aminata@baobab.ci" },
  number: "DEV-2026-0001",
  issueDate: new Date("2026-09-22T00:00:00Z"),
  expiryDate: null,
  currency: "XOF",
  locale: "fr-FR",
  items: [{ description: "Développement site web", quantity: 1, unitPriceMinor: 850000, taxRate: 18 }],
  subtotalMinor: 850000,
  discountMinor: 0,
  taxMinor: 153000,
  totalMinor: 1003000,
  depositMinor: 300900,
  notes: "Merci de votre confiance.",
};

describe("génération du PDF avec pdf-lib", () => {
  it("produit un document PDF lisible", async () => {
    const buffer = await renderQuotePdf(sample);
    expect(buffer.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    expect((await PDFDocument.load(buffer)).getPageCount()).toBe(1);
  });

  it("produit un PDF valide avec le logo Alymero", async () => {
    const logo = await readFile(path.join(process.cwd(), "public", "brand", "alymero-mark.png"));
    const buffer = await renderQuotePdf({
      ...sample,
      org: { ...sample.org, logoDataUri: `data:image/png;base64,${logo.toString("base64")}` },
    });
    expect((await PDFDocument.load(buffer)).getPageCount()).toBe(1);
  });

  it("conserve toutes les lignes en créant des pages supplémentaires", async () => {
    const buffer = await renderQuotePdf({
      ...sample,
      items: Array.from({ length: 20 }, (_, index) => ({
        description: `Prestation numéro ${index + 1}`,
        quantity: 1,
        unitPriceMinor: 10000,
        taxRate: 0,
      })),
    });
    expect((await PDFDocument.load(buffer)).getPageCount()).toBeGreaterThan(1);
  });
});
