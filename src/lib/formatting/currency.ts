/**
 * Formatage des montants monétaires (multi-devise).
 *
 * CONVENTION : les montants sont stockés en ENTIERS, dans la plus petite unité
 * de la devise (ex. centimes pour EUR, unité pour XOF qui n'a pas de subdivision
 * d'usage). Cette fonction convertit l'entier stocké en montant affichable.
 */

/** Nombre de décimales par devise (ISO 4217). XOF/XAF n'ont pas de décimale d'usage. */
const CURRENCY_MINOR_UNITS: Record<string, number> = {
  XOF: 0,
  XAF: 0,
  EUR: 2,
  USD: 2,
  CAD: 2,
};

export function minorUnitsFor(currency: string): number {
  return CURRENCY_MINOR_UNITS[currency.toUpperCase()] ?? 2;
}

/**
 * Formate un montant (stocké en plus petite unité) selon la devise et la locale.
 * @param amountMinor montant entier dans la plus petite unité (ex. 4320000 XOF).
 */
export function formatCurrency(
  amountMinor: number,
  currency: string,
  locale = "fr-FR",
): string {
  const minorUnits = minorUnitsFor(currency);
  const value = amountMinor / 10 ** minorUnits;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: currency.toUpperCase(),
    minimumFractionDigits: minorUnits,
    maximumFractionDigits: minorUnits,
  }).format(value);
}

/** Formate une date en toutes lettres (ex. « mardi 27 mai 2025 »). */
export function formatLongDate(date: Date, locale = "fr-FR"): string {
  return new Intl.DateTimeFormat(locale, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}
