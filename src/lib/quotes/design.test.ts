import { describe, expect, it } from "vitest";
import { DEFAULT_QUOTE_DESIGN, QUOTE_PALETTES, QUOTE_TEMPLATES, matchingPalette, parseQuoteDesign, readableOn, tintOf } from "./design";

describe("mise en page des devis", () => {
  it("accepte les anciens designs sans couleur secondaire", () => {
    expect(parseQuoteDesign({ template: "classic", accent: "#2F855A", font: "inter" })).toEqual({ template: "classic", accent: "#2F855A", font: "inter" });
  });

  it("refuse un modèle ou une couleur inconnus", () => {
    expect(parseQuoteDesign({ template: "baroque", accent: "#2F855A", font: "inter" })).toBeNull();
    expect(parseQuoteDesign({ template: "classic", accent: "vert", font: "inter" })).toBeNull();
  });

  it("propose 8 modèles et 10 palettes distincts", () => {
    expect(new Set(QUOTE_TEMPLATES.map((t) => t.value)).size).toBe(8);
    expect(new Set(QUOTE_PALETTES.map((p) => p.id)).size).toBe(10);
  });

  it("reconnaît une palette prédéfinie et détecte une palette personnalisée", () => {
    expect(matchingPalette(DEFAULT_QUOTE_DESIGN)?.id).toBe("alymero");
    expect(matchingPalette({ ...DEFAULT_QUOTE_DESIGN, accent: "#123456" })).toBeNull();
  });

  it("calcule une teinte claire et un texte lisible", () => {
    expect(tintOf("#000000", 0.1)).toBe("#E6E6E6");
    expect(readableOn("#12263A")).toBe("#FFFFFF");
    expect(readableOn("#F5F5F5")).toBe("#12263A");
  });
});
