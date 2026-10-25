import { describe, expect, it } from "vitest";
import { quoteVariableValues, resolveQuoteVariables } from "./variables";

const values = quoteVariableValues({
  contact: { firstName: "Ibrahim", lastName: "Yao", companyName: "Yao Digital" },
  number: "DEV-2026-0142",
  totalLabel: "1 003 000 FCFA",
  expiryDate: null,
  organizationName: "Studio Kalia",
  locale: "fr-FR",
});

describe("variables de devis", () => {
  it("remplace les variables connues", () => {
    expect(resolveQuoteVariables("Bonjour {client.prenom}, voici le devis {devis.numero} de {organisation.nom}.", values)).toBe(
      "Bonjour Ibrahim, voici le devis DEV-2026-0142 de Studio Kalia.",
    );
  });

  it("laisse visibles les variables inconnues ou sans valeur", () => {
    expect(resolveQuoteVariables("{client.age} — {devis.validite}", values)).toBe("{client.age} — {devis.validite}");
  });

  it("utilise le nom complet quand le client n'a pas d'entreprise", () => {
    const v = quoteVariableValues({ contact: { firstName: "Awa", lastName: "Koné", companyName: null }, number: "X", totalLabel: "0", expiryDate: null, organizationName: "O", locale: "fr-FR" });
    expect(resolveQuoteVariables("{client.entreprise}", v)).toBe("Awa Koné");
  });

  it("conserve null", () => {
    expect(resolveQuoteVariables(null, values)).toBeNull();
  });
});
