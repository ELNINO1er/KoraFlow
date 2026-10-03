import { describe, expect, it } from "vitest";
import { inspectPrivateFile, InvalidDocumentError } from "./file-validation";

describe("validation des documents privés", () => {
  it("détecte un PDF par sa signature et calcule son empreinte", () => {
    const result = inspectPrivateFile("contrat.pdf", Buffer.from("%PDF-1.7\nexemple"));
    expect(result.mimeType).toBe("application/pdf");
    expect(result.extension).toBe("pdf");
    expect(result.sha256).toMatch(/^[a-f0-9]{64}$/);
  });

  it("ne fait pas confiance à l'extension du fichier", () => {
    expect(() => inspectPrivateFile("virus.pdf", Buffer.from("pas un pdf"))).toThrowError(
      InvalidDocumentError,
    );
  });

  it("refuse les noms pouvant injecter un en-tête", () => {
    expect(() => inspectPrivateFile("fichier\r\nX-Evil.pdf", Buffer.from("%PDF-1.7"))).toThrowError(
      InvalidDocumentError,
    );
  });
});
