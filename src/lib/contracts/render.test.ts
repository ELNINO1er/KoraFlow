import { describe, it, expect } from "vitest";
import { renderTemplate, extractVariables } from "./render";

describe("renderTemplate", () => {
  it("remplace les variables", () => {
    expect(
      renderTemplate("Contrat entre {{org_name}} et {{client_name}}.", {
        org_name: "Agence Démo",
        client_name: "Baobab Services",
      }),
    ).toBe("Contrat entre Agence Démo et Baobab Services.");
  });

  it("tolère les espaces internes", () => {
    expect(renderTemplate("N° {{ quote_number }}", { quote_number: "DEV-1" })).toBe(
      "N° DEV-1",
    );
  });

  it("remplace une variable inconnue par une chaîne vide", () => {
    expect(renderTemplate("Bonjour {{inconnu}}!", {})).toBe("Bonjour !");
  });

  it("extractVariables liste les variables uniques", () => {
    expect(extractVariables("{{a}} {{b}} {{a}}").sort()).toEqual(["a", "b"]);
  });
});
