import { describe, it, expect } from "vitest";
import {
  can,
  assertCan,
  PermissionError,
  permissionsForRole,
  RESOURCES,
  ACTIONS,
} from "./permissions";

describe("matrice de permissions (§11)", () => {
  it("OWNER a un contrôle total (toutes ressources × actions)", () => {
    for (const r of RESOURCES) {
      for (const a of ACTIONS) {
        expect(can("OWNER", `${r}.${a}`)).toBe(true);
      }
    }
  });

  it("ADMIN peut gérer les membres mais NE PEUT PAS supprimer l'organisation", () => {
    expect(can("ADMIN", "members.manage")).toBe(true);
    expect(can("ADMIN", "invoices.create")).toBe(true);
    expect(can("ADMIN", "organization.delete")).toBe(false);
    // seul le propriétaire supprime l'organisation
    expect(can("OWNER", "organization.delete")).toBe(true);
  });

  it("SALES gère les devis/contacts mais pas la facturation ni les paiements", () => {
    expect(can("SALES", "quotes.create")).toBe(true);
    expect(can("SALES", "contacts.update")).toBe(true);
    expect(can("SALES", "invoices.view")).toBe(true);
    expect(can("SALES", "invoices.create")).toBe(false);
    expect(can("SALES", "payments.create")).toBe(false);
    expect(can("SALES", "members.manage")).toBe(false);
  });

  it("ACCOUNTANT gère factures/paiements mais ne crée pas de contacts", () => {
    expect(can("ACCOUNTANT", "invoices.create")).toBe(true);
    expect(can("ACCOUNTANT", "payments.update")).toBe(true);
    expect(can("ACCOUNTANT", "contacts.view")).toBe(true);
    expect(can("ACCOUNTANT", "contacts.create")).toBe(false);
    expect(can("ACCOUNTANT", "quotes.create")).toBe(false);
  });

  it("PROJECT_MANAGER pilote les projets, en lecture ailleurs", () => {
    expect(can("PROJECT_MANAGER", "projects.manage")).toBe(true);
    expect(can("PROJECT_MANAGER", "projects.update")).toBe(true);
    expect(can("PROJECT_MANAGER", "quotes.view")).toBe(true);
    expect(can("PROJECT_MANAGER", "quotes.create")).toBe(false);
  });

  it("COLLABORATOR a des droits restreints", () => {
    expect(can("COLLABORATOR", "projects.view")).toBe(true);
    expect(can("COLLABORATOR", "projects.update")).toBe(true);
    expect(can("COLLABORATOR", "projects.delete")).toBe(false);
    expect(can("COLLABORATOR", "invoices.view")).toBe(false);
  });

  it("CLIENT n'a AUCUN droit d'administration", () => {
    expect(permissionsForRole("CLIENT").size).toBe(0);
    expect(can("CLIENT", "quotes.view")).toBe(false);
    expect(can("CLIENT", "invoices.view")).toBe(false);
    expect(can("CLIENT", "projects.view")).toBe(false);
  });

  it("assertCan lève PermissionError quand le droit manque", () => {
    expect(() => assertCan("SALES", "invoices.create")).toThrow(PermissionError);
    expect(() => assertCan("OWNER", "invoices.create")).not.toThrow();
  });
});
