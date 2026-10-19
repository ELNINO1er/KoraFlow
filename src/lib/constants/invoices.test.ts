import { describe, expect, it } from "vitest";
import { isManualInvoiceTransition, manualInvoiceStatusesFor, isInvoiceOverdue } from "./invoices";

describe("transitions manuelles des factures", () => {
  it("interdit de forger un statut financier", () => {
    expect(isManualInvoiceTransition("SENT", "PAID")).toBe(false);
    expect(isManualInvoiceTransition("SENT", "PARTIALLY_PAID")).toBe(false);
  });

  it("autorise les transitions administratives prévues", () => {
    expect(isManualInvoiceTransition("DRAFT", "SENT")).toBe(true);
    expect(isManualInvoiceTransition("OVERDUE", "CANCELED")).toBe(true);
  });

  // Règle mise à jour : le RETARD est un indicateur dérivé, plus un statut
  // sélectionnable manuellement. On ne peut donc plus passer SENT -> OVERDUE
  // « à la main » (ce qui, auparavant, était écrasé au recalcul de toute façon).
  it("n'autorise plus de passer manuellement une facture en OVERDUE", () => {
    expect(isManualInvoiceTransition("SENT", "OVERDUE")).toBe(false);
    expect(isManualInvoiceTransition("PARTIALLY_PAID", "OVERDUE")).toBe(false);
  });

  it("ne propose aucune transition manuelle depuis une facture payée", () => {
    expect(manualInvoiceStatusesFor("PAID").map((status) => status.value)).toEqual(["PAID"]);
  });
});

describe("isInvoiceOverdue (indicateur de retard dérivé)", () => {
  const past = new Date(Date.now() - 86_400_000);
  const future = new Date(Date.now() + 86_400_000);

  it("en retard si SENT et échéance passée", () => {
    expect(isInvoiceOverdue({ status: "SENT", dueDate: past })).toBe(true);
  });

  it("en retard si PARTIALLY_PAID et échéance passée (coexistence)", () => {
    expect(isInvoiceOverdue({ status: "PARTIALLY_PAID", dueDate: past })).toBe(true);
  });

  it("jamais en retard sans échéance, ou si payée/annulée/brouillon, ou si échéance future", () => {
    expect(isInvoiceOverdue({ status: "SENT", dueDate: null })).toBe(false);
    expect(isInvoiceOverdue({ status: "PAID", dueDate: past })).toBe(false);
    expect(isInvoiceOverdue({ status: "CANCELED", dueDate: past })).toBe(false);
    expect(isInvoiceOverdue({ status: "DRAFT", dueDate: past })).toBe(false);
    expect(isInvoiceOverdue({ status: "SENT", dueDate: future })).toBe(false);
  });
});
