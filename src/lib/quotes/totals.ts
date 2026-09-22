/**
 * Calcul des totaux d'un devis — fonction PURE (aucune dépendance, testable).
 *
 * Tous les montants sont des ENTIERS, dans la plus petite unité de la devise.
 * Ordre de calcul :
 *   1. sous-total HT = Σ (prix unitaire × quantité)
 *   2. remise globale (en % du sous-total, ou montant fixe plafonné)
 *   3. la remise est répartie proportionnellement sur chaque ligne, puis la
 *      taxe de chaque ligne est calculée sur le montant HT remisé de la ligne
 *   4. TTC = HT remisé + taxes
 *   5. acompte (en % du TTC, ou montant fixe plafonné) ; reste = TTC − acompte
 */

export type AmountKind = "PERCENT" | "AMOUNT";

export interface QuoteLineInput {
  unitPriceMinor: number;
  quantity: number;
  taxRate: number; // points de %
}

export interface QuoteTotalsInput {
  lines: QuoteLineInput[];
  discountType?: AmountKind | null;
  discountValue?: number;
  depositType?: AmountKind | null;
  depositValue?: number;
}

export interface QuoteTotals {
  subtotalMinor: number; // HT avant remise
  discountMinor: number; // remise effectivement appliquée
  totalHtMinor: number; // HT après remise
  taxMinor: number;
  totalMinor: number; // TTC
  depositMinor: number;
  remainingMinor: number; // reste à payer
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function computeQuoteTotals(input: QuoteTotalsInput): QuoteTotals {
  const lines = input.lines ?? [];

  const subtotal = lines.reduce(
    (sum, l) => sum + Math.round(l.unitPriceMinor) * Math.round(l.quantity),
    0,
  );

  // Remise globale demandée.
  let requestedDiscount = 0;
  if (input.discountType === "PERCENT") {
    requestedDiscount = Math.round(
      (subtotal * clamp(input.discountValue ?? 0, 0, 100)) / 100,
    );
  } else if (input.discountType === "AMOUNT") {
    requestedDiscount = clamp(input.discountValue ?? 0, 0, subtotal);
  }

  const ratio = subtotal > 0 ? (subtotal - requestedDiscount) / subtotal : 0;

  let totalHt = 0;
  let tax = 0;
  for (const line of lines) {
    const lineHt = Math.round(line.unitPriceMinor) * Math.round(line.quantity);
    const discountedLineHt = Math.round(lineHt * ratio);
    totalHt += discountedLineHt;
    tax += Math.round((discountedLineHt * clamp(line.taxRate, 0, 100)) / 100);
  }

  // La remise réelle intègre les arrondis par ligne (subtotal − HT remisé).
  const discount = subtotal - totalHt;
  const total = totalHt + tax;

  let deposit = 0;
  if (input.depositType === "PERCENT") {
    deposit = Math.round((total * clamp(input.depositValue ?? 0, 0, 100)) / 100);
  } else if (input.depositType === "AMOUNT") {
    deposit = clamp(input.depositValue ?? 0, 0, total);
  }

  return {
    subtotalMinor: subtotal,
    discountMinor: discount,
    totalHtMinor: totalHt,
    taxMinor: tax,
    totalMinor: total,
    depositMinor: deposit,
    remainingMinor: total - deposit,
  };
}
