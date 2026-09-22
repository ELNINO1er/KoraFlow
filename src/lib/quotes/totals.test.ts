import { describe, it, expect } from "vitest";
import { computeQuoteTotals } from "./totals";

describe("computeQuoteTotals", () => {
  it("ligne simple sans taxe ni remise", () => {
    const t = computeQuoteTotals({
      lines: [{ unitPriceMinor: 100000, quantity: 2, taxRate: 0 }],
    });
    expect(t.subtotalMinor).toBe(200000);
    expect(t.taxMinor).toBe(0);
    expect(t.totalMinor).toBe(200000);
    expect(t.remainingMinor).toBe(200000);
  });

  it("applique la TVA à 18 %", () => {
    const t = computeQuoteTotals({
      lines: [{ unitPriceMinor: 100000, quantity: 2, taxRate: 18 }],
    });
    expect(t.taxMinor).toBe(36000);
    expect(t.totalMinor).toBe(236000);
  });

  it("additionne plusieurs lignes", () => {
    const t = computeQuoteTotals({
      lines: [
        { unitPriceMinor: 100000, quantity: 1, taxRate: 18 },
        { unitPriceMinor: 50000, quantity: 2, taxRate: 18 },
      ],
    });
    expect(t.subtotalMinor).toBe(200000);
    expect(t.taxMinor).toBe(36000);
    expect(t.totalMinor).toBe(236000);
  });

  it("remise en pourcentage (10 %)", () => {
    const t = computeQuoteTotals({
      lines: [{ unitPriceMinor: 100000, quantity: 2, taxRate: 18 }],
      discountType: "PERCENT",
      discountValue: 10,
    });
    expect(t.discountMinor).toBe(20000);
    expect(t.totalHtMinor).toBe(180000);
    expect(t.taxMinor).toBe(32400);
    expect(t.totalMinor).toBe(212400);
  });

  it("remise en montant fixe", () => {
    const t = computeQuoteTotals({
      lines: [{ unitPriceMinor: 100000, quantity: 2, taxRate: 18 }],
      discountType: "AMOUNT",
      discountValue: 50000,
    });
    expect(t.discountMinor).toBe(50000);
    expect(t.totalHtMinor).toBe(150000);
    expect(t.taxMinor).toBe(27000);
    expect(t.totalMinor).toBe(177000);
  });

  it("remise plafonnée au sous-total", () => {
    const t = computeQuoteTotals({
      lines: [{ unitPriceMinor: 100000, quantity: 2, taxRate: 18 }],
      discountType: "AMOUNT",
      discountValue: 999999,
    });
    expect(t.discountMinor).toBe(200000);
    expect(t.totalMinor).toBe(0);
  });

  it("acompte en pourcentage (30 %)", () => {
    const t = computeQuoteTotals({
      lines: [{ unitPriceMinor: 100000, quantity: 2, taxRate: 18 }],
      depositType: "PERCENT",
      depositValue: 30,
    });
    expect(t.totalMinor).toBe(236000);
    expect(t.depositMinor).toBe(70800);
    expect(t.remainingMinor).toBe(165200);
  });

  it("acompte en montant plafonné au TTC", () => {
    const t = computeQuoteTotals({
      lines: [{ unitPriceMinor: 100000, quantity: 2, taxRate: 18 }],
      depositType: "AMOUNT",
      depositValue: 300000,
    });
    expect(t.depositMinor).toBe(236000);
    expect(t.remainingMinor).toBe(0);
  });

  it("devis vide = tout à zéro", () => {
    const t = computeQuoteTotals({ lines: [] });
    expect(t).toMatchObject({
      subtotalMinor: 0,
      discountMinor: 0,
      taxMinor: 0,
      totalMinor: 0,
      remainingMinor: 0,
    });
  });
});
