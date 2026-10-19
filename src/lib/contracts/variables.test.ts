import { describe, it, expect } from "vitest";
import {
  resolveTemplate,
  referencedVariables,
  unknownVariables,
  unresolvedVariablesMessage,
} from "./variables";

describe("variables de contrat (résolution stricte)", () => {
  const values = {
    org_name: "ACME",
    client_name: "Client SARL",
    quote_number: "DEV-2026-0001",
    total_ttc: "1 180 000 FCFA",
    date: "1 janvier 2026",
  };

  it("substitue les variables connues renseignées", () => {
    const res = resolveTemplate("Entre {{org_name}} et {{client_name}}.", values);
    expect(res.text).toBe("Entre ACME et Client SARL.");
    expect(res.unknown).toHaveLength(0);
    expect(res.missing).toHaveLength(0);
    expect(unresolvedVariablesMessage(res)).toBeNull();
  });

  it("ne vide JAMAIS une variable inconnue : elle est signalée et laissée visible", () => {
    const res = resolveTemplate("Adresse : {{client_adresse}}", values);
    expect(res.unknown).toContain("client_adresse");
    expect(res.text).toContain("{{client_adresse}}");
    expect(unresolvedVariablesMessage(res)).toMatch(/inconnue/i);
  });

  it("signale une variable connue non renseignée", () => {
    const res = resolveTemplate("Montant {{total_ttc}}", { ...values, total_ttc: "" });
    expect(res.missing).toContain("total_ttc");
    expect(res.text).toContain("{{total_ttc}}");
    expect(unresolvedVariablesMessage(res)).toMatch(/non renseign/i);
  });

  it("referencedVariables / unknownVariables", () => {
    const body = "{{org_name}} {{client_name}} {{foo}}";
    expect(referencedVariables(body).sort()).toEqual(["client_name", "foo", "org_name"]);
    expect(unknownVariables(body)).toEqual(["foo"]);
  });
});
