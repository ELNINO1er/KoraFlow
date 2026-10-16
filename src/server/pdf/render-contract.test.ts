import { describe, expect, it } from "vitest";
import { PDFDocument } from "pdf-lib";
import { renderContractPdf } from "./render-contract";

const base = {
  number: "CTR-2026-0001",
  title: "Contrat de prestation",
  content: "Le client accepte les conditions de la prestation.\n\nLa livraison est prévue après validation.",
  organization: { name: "Entreprise Démo" },
  clientName: "Client Démo",
  createdAt: new Date("2026-10-16T12:00:00Z"),
  locale: "fr-FR",
};

describe("renderContractPdf", () => {
  it("génère un PDF lisible pour un contrat à signer", async () => {
    const buffer = await renderContractPdf(base);
    expect(buffer.subarray(0, 5).toString()).toBe("%PDF-");
    const document = await PDFDocument.load(buffer);
    expect(document.getPageCount()).toBeGreaterThan(0);
    expect(document.getTitle()).toContain(base.number);
  });

  it("génère le certificat dans le PDF signé", async () => {
    const buffer = await renderContractPdf({
      ...base,
      signedAt: new Date("2026-10-16T13:00:00Z"),
      signerName: "Client Démo",
      signerEmail: "client@example.test",
      contentHash: "a".repeat(64),
    });
    expect(buffer.byteLength).toBeGreaterThan(1_000);
    expect((await PDFDocument.load(buffer)).getPageCount()).toBeGreaterThan(0);
  });
});
