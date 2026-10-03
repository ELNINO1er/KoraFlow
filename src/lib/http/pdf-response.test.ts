import { describe, expect, it } from "vitest";
import { pdfResponse, safePdfFilename } from "./pdf-response";

describe("réponses PDF privées", () => {
  it("neutralise les caractères dangereux dans le nom du fichier", () => {
    expect(safePdfFilename('DEV-2026-0001"\r\nX-Evil: yes.pdf')).toBe(
      "DEV-2026-0001-X-Evil-yes.pdf",
    );
  });

  it("retourne des en-têtes empêchant cache, indexation et sniffing", () => {
    const response = pdfResponse(Buffer.from("pdf"), "Facture été.pdf");

    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(response.headers.get("x-robots-tag")).toContain("noindex");
    expect(response.headers.get("content-disposition")).toBe(
      'inline; filename="Facture-ete.pdf"',
    );
  });
});
