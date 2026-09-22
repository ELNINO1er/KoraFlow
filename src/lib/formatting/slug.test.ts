import { describe, it, expect } from "vitest";
import { slugify } from "./slug";

describe("slugify", () => {
  it("met en minuscules et remplace les espaces", () => {
    expect(slugify("Mon Entreprise")).toBe("mon-entreprise");
  });

  it("retire les accents (français)", () => {
    expect(slugify("Agence Démo")).toBe("agence-demo");
    expect(slugify("Côte d'Ivoire")).toBe("cote-d-ivoire");
    expect(slugify("Éàûç")).toBe("eauc");
  });

  it("supprime les tirets superflus en début/fin", () => {
    expect(slugify("  --Studio!!  ")).toBe("studio");
  });

  it("compacte les séparateurs multiples", () => {
    expect(slugify("A   &   B")).toBe("a-b");
  });

  it("tronque à 60 caractères", () => {
    expect(slugify("a".repeat(100)).length).toBe(60);
  });
});
