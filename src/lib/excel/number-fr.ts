/**
 * Analyse de nombres au format français, SANS interprétation silencieuse d'une
 * valeur ambiguë.
 *
 * Règles :
 *  - Les espaces (y compris insécables / fines) sont des séparateurs de milliers.
 *  - La virgule OU le point servent de séparateur décimal (pas les deux comme
 *    décimale). Si les deux sont présents, la virgule est la décimale et le
 *    point le millier (convention FR) : « 1.234,56 » → 1234.56.
 *  - Le nombre de décimales ne doit pas dépasser la précision de la devise
 *    (contrôlé par l'appelant via `maxDecimals`), afin de ne jamais arrondir
 *    silencieusement (ex. un prix à 2 décimales sur une devise à 0 décimale).
 */

export type ParsedNumber =
  | { ok: true; value: number }
  | { ok: false; error: string };

export function parseFrenchDecimal(raw: string, maxDecimals: number): ParsedNumber {
  const trimmed = raw.trim();
  if (trimmed === "") return { ok: false, error: "valeur vide" };

  // Retire les séparateurs de milliers (espaces normaux, insécables, fins).
  let t = trimmed.replace(/[\s  ]/g, "");

  const hasComma = t.includes(",");
  const hasDot = t.includes(".");
  if (hasComma && hasDot) {
    // Convention FR : point = millier, virgule = décimale.
    t = t.replace(/\./g, "").replace(",", ".");
  } else if (hasComma) {
    if ((t.match(/,/g) ?? []).length > 1) return { ok: false, error: `nombre ambigu : « ${raw} »` };
    t = t.replace(",", ".");
  } else if (hasDot) {
    if ((t.match(/\./g) ?? []).length > 1) return { ok: false, error: `nombre ambigu : « ${raw} »` };
    // point unique = décimale
  }

  if (!/^-?\d+(\.\d+)?$/.test(t)) return { ok: false, error: `nombre invalide : « ${raw} »` };

  const decimals = t.includes(".") ? t.split(".")[1]!.length : 0;
  if (decimals > maxDecimals) {
    return {
      ok: false,
      error:
        maxDecimals === 0
          ? `la devise n'accepte pas de décimale : « ${raw} »`
          : `trop de décimales (max ${maxDecimals}) : « ${raw} »`,
    };
  }

  const value = Number(t);
  if (!Number.isFinite(value)) return { ok: false, error: `nombre invalide : « ${raw} »` };
  return { ok: true, value };
}
