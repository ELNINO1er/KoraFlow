/**
 * Normalisation d'en-têtes de colonnes pour la reconnaissance automatique :
 * minuscules, sans accents, sans ponctuation ni espaces superflus.
 */
export function normalizeHeader(raw: string): string {
  return raw
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // diacritiques
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Spécification d'un champ cible pour la correspondance de colonnes. */
export interface FieldSpec {
  key: string;
  label: string;
  required: boolean;
  /** En-têtes français usuels reconnus automatiquement (déjà normalisés). */
  aliases: string[];
  help?: string;
}

/**
 * Associe automatiquement chaque champ à l'index de colonne d'une ligne
 * d'en-têtes, via les alias normalisés. Renvoie un mapping {key -> index} et la
 * liste des champs requis non trouvés.
 */
export function autoMapColumns(
  headerRow: string[],
  fields: FieldSpec[],
): { mapping: Record<string, number>; missingRequired: string[] } {
  const normalized = headerRow.map((h) => normalizeHeader(h ?? ""));
  const mapping: Record<string, number> = {};
  for (const field of fields) {
    const idx = normalized.findIndex(
      (h) => h === normalizeHeader(field.label) || field.aliases.includes(h),
    );
    if (idx >= 0) mapping[field.key] = idx;
  }
  const missingRequired = fields
    .filter((f) => f.required && mapping[f.key] === undefined)
    .map((f) => f.label);
  return { mapping, missingRequired };
}
