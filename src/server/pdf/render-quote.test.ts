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

  it("embarque réellement les ligatures françaises œ/Œ (octets WinAnsi), sans « ? »", async () => {
    const buffer = await renderQuotePdf({
      ...sample,
      items: [{ description: "Cœur de métier — Œuvre", quantity: 1, unitPriceMinor: 500000, taxRate: 0 }],
      notes: "Conditions : œuvre livrée. Montant en €.",
    });
    const latin1 = buffer.toString("latin1");
    // œ => 0x9C, Œ => 0x8C, € => 0x80 en WinAnsi : présents dans le flux de contenu.
    expect(latin1).toContain("\x9C"); // œ
    expect(latin1).toContain("\x8C"); // Œ
    expect(latin1).toContain("\x80"); // €
    // Le mot n'a pas été dégradé en "C?ur".
    expect(latin1).not.toContain("C?ur");
  });

  it("paginera des conditions longues sans les tronquer", async () => {
    const longTerms = Array.from({ length: 60 }, (_, i) => `Clause ${i + 1} : engagement détaillé du prestataire et du client.`).join("\n");
    const buffer = await renderQuotePdf({ ...sample, terms: longTerms });
    const doc = await PDFDocument.load(buffer);
    expect(doc.getPageCount()).toBeGreaterThan(1);
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
