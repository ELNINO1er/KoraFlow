import { describe, it, expect } from "vitest";
import {
  sanitizeWinAnsi,
  collectUnsupportedCharacters,
  isWinAnsiEncodable,
} from "./winansi";

describe("WinAnsi (fidélité PDF français)", () => {
  it("conserve les accents français, œ/Œ et €", () => {
    const input = "Cœur, Œuvre, à â ä ç é è ê ë î ï ô ö ù û ü ÿ, 1 180 € — « guillemets »";
    const out = sanitizeWinAnsi(input);
    expect(out).toContain("œ");
    expect(out).toContain("Œ");
    expect(out).toContain("€");
    expect(out).toContain("é");
    expect(out).not.toContain("?");
  });

  it("préserve les retours à la ligne", () => {
    expect(sanitizeWinAnsi("ligne1\nligne2")).toBe("ligne1\nligne2");
  });

  it("ne signale aucun caractère non supporté pour du texte français", () => {
    expect(collectUnsupportedCharacters(["Prestation : développement, œuvre, 500 €"]))
      .toHaveLength(0);
  });

  it("détecte les caractères non représentables (arabe, cyrillique, emoji)", () => {
    const unsupported = collectUnsupportedCharacters(["Bonjour مرحبا Привет 🚀"]);
    expect(unsupported.length).toBeGreaterThan(0);
    // Le français environnant n'est jamais compté.
    expect(unsupported).not.toContain("B");
  });

  it("isWinAnsiEncodable : œ oui, caractère arabe non", () => {
    expect(isWinAnsiEncodable("œ".codePointAt(0)!)).toBe(true);
    expect(isWinAnsiEncodable("€".codePointAt(0)!)).toBe(true);
    expect(isWinAnsiEncodable("م".codePointAt(0)!)).toBe(false);
  });
});
