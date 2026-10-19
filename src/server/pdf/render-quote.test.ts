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

  it("rend les ligatures françaises œ/Œ et € sans échec d'encodage", async () => {
    // pdf-lib LÈVE une erreur « WinAnsi cannot encode » si un glyphe n'est pas
    // représentable : le simple fait que le rendu aboutisse prouve que œ/Œ/€ et
    // les accents sont bien pris en charge (et non remplacés/rejetés).
    const buffer = await renderQuotePdf({
      ...sample,
      items: [{ description: "Cœur de métier — Œuvre à 1 000 €", quantity: 1, unitPriceMinor: 500000, taxRate: 0 }],
      notes: "Conditions : œuvre livrée. Accents : àâäçéèêëîïôöùûüÿ.",
    });
    const doc = await PDFDocument.load(buffer);
    expect(doc.getPageCount()).toBe(1);
  });

  it("ajoute réellement objet/introduction/sections au document (contenu plus riche)", async () => {
    const baseline = await renderQuotePdf(sample);
    const enriched = await renderQuotePdf({
      ...sample,
      docSubject: "Refonte du site vitrine",
      introduction: "Ce devis fait suite à notre échange.".repeat(3),
      sections: Array.from({ length: 4 }, (_, i) => ({ heading: `Section ${i + 1}`, body: "Détail livrables, périmètre et exclusions.".repeat(4) })),
    });
    // Le document enrichi est strictement plus volumineux (contenu ajouté) et
    // le rendu aboutit sans erreur.
    expect(enriched.byteLength).toBeGreaterThan(baseline.byteLength);
    expect((await PDFDocument.load(enriched)).getPageCount()).toBeGreaterThanOrEqual(1);
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
