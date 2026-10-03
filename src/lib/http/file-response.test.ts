import { describe, expect, it } from "vitest";
import { privateFileResponse, safeAttachmentFilename } from "./file-response";

describe("téléchargement privé", () => {
  it("assainit le nom fourni à Content-Disposition", () => {
    expect(safeAttachmentFilename("livrable\r\nX-Test: oui.pdf")).toBe("livrable-X-Test-oui.pdf");
  });

  it("force le téléchargement sans cache ni sniffing", () => {
    const response = privateFileResponse(new Uint8Array([1, 2]), "preuve.pdf", "application/pdf");
    expect(response.headers.get("content-disposition")).toContain("attachment");
    expect(response.headers.get("cache-control")).toContain("no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
  });
});
