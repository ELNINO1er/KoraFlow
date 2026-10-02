import { describe, expect, it } from "vitest";
import { isManualInvoiceTransition, manualInvoiceStatusesFor } from "./invoices";

describe("transitions manuelles des factures", () => {
  it("interdit de forger un statut financier", () => {
    expect(isManualInvoiceTransition("SENT", "PAID")).toBe(false);
    expect(isManualInvoiceTransition("SENT", "PARTIALLY_PAID")).toBe(false);
  });

  it("autorise les transitions administratives prévues", () => {
    expect(isManualInvoiceTransition("DRAFT", "SENT")).toBe(true);
    expect(isManualInvoiceTransition("SENT", "OVERDUE")).toBe(true);
    expect(isManualInvoiceTransition("OVERDUE", "CANCELED")).toBe(true);
  });

  it("ne propose aucune transition manuelle depuis une facture payée", () => {
    expect(manualInvoiceStatusesFor("PAID").map((status) => status.value)).toEqual(["PAID"]);
  });
});
