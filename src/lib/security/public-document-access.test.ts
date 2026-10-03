import { describe, expect, it } from "vitest";
import { isValidPublicDocumentToken } from "./public-document-access";

describe("accès public aux documents", () => {
  it("accepte uniquement les jetons hexadécimaux de 192 bits", () => {
    expect(isValidPublicDocumentToken("a".repeat(48))).toBe(true);
    expect(isValidPublicDocumentToken("A".repeat(48))).toBe(false);
    expect(isValidPublicDocumentToken("a".repeat(47))).toBe(false);
    expect(isValidPublicDocumentToken("../document-secret")).toBe(false);
  });
});
