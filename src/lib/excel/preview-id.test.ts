import { describe, it, expect } from "vitest";
import { newImportPreviewId, previewIdCreatedAt, isPreviewExpired, IMPORT_PREVIEW_TTL_MS } from "./preview-id";

describe("identifiant d'aperçu d'import (horodaté)", () => {
  it("encode l'horodatage et reste au format 36 hex", () => {
    const now = 1_760_000_000_000;
    const id = newImportPreviewId(now);
    expect(id).toMatch(/^[a-f0-9]{36}$/);
    expect(previewIdCreatedAt(id)).toBe(now);
  });

  it("détecte l'expiration au-delà du TTL", () => {
    const created = 1_760_000_000_000;
    const id = newImportPreviewId(created);
    expect(isPreviewExpired(id, created + 1000)).toBe(false);
    expect(isPreviewExpired(id, created + IMPORT_PREVIEW_TTL_MS + 1)).toBe(true);
  });

  it("considère un identifiant illisible comme expiré (sécurité)", () => {
    expect(isPreviewExpired("not-a-valid-id", Date.now())).toBe(true);
  });
});
