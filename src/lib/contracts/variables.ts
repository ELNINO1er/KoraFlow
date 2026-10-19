/**
 * Catalogue des variables disponibles dans les modèles de contrat et résolution
 * STRICTE : une variable inconnue ou non renseignée n'est JAMAIS remplacée
 * silencieusement par du vide — elle est signalée pour permettre un blocage
 * explicite avant génération/envoi.
 */

export interface ContractVariable {
  key: string;
  label: string;
  description: string;
}

/** Variables alimentées automatiquement depuis le devis et l'organisation. */
export const CONTRACT_VARIABLES: ContractVariable[] = [
  { key: "org_name", label: "Nom du prestataire", description: "Nom de votre organisation." },
  { key: "client_name", label: "Nom du client", description: "Société ou nom complet du client." },
  { key: "quote_number", label: "Numéro de devis", description: "Référence du devis associé." },
  { key: "total_ttc", label: "Montant TTC", description: "Total TTC du devis, formaté." },
  { key: "date", label: "Date du jour", description: "Date de génération du contrat." },
];

export const CONTRACT_VARIABLE_KEYS: ReadonlySet<string> = new Set(
  CONTRACT_VARIABLES.map((v) => v.key),
);

const TOKEN_RE = /\{\{\s*([\w.]+)\s*\}\}/g;

/** Variables référencées (distinctes) dans un corps de modèle. */
export function referencedVariables(body: string): string[] {
  const found = new Set<string>();
  for (const m of body.matchAll(TOKEN_RE)) if (m[1]) found.add(m[1]);
  return [...found];
}

/** Variables du modèle qui ne font pas partie du catalogue connu. */
export function unknownVariables(body: string): string[] {
  return referencedVariables(body).filter((k) => !CONTRACT_VARIABLE_KEYS.has(k));
}

export interface TemplateResolution {
  text: string;
  /** Variables référencées mais hors catalogue. */
  unknown: string[];
  /** Variables du catalogue référencées mais sans valeur (vide/absente). */
  missing: string[];
}

/**
 * Substitue les variables. Contrairement à l'ancien `renderTemplate`, ne masque
 * aucune variable : les inconnues et les non renseignées sont collectées et
 * laissées telles quelles (`{{clef}}`) dans le texte, afin que l'appelant puisse
 * bloquer l'opération avec un message précis. Rien n'est remplacé par du vide.
 */
export function resolveTemplate(
  body: string,
  variables: Record<string, string | null | undefined>,
): TemplateResolution {
  const unknown = new Set<string>();
  const missing = new Set<string>();
  const text = body.replace(TOKEN_RE, (match, key: string) => {
    if (!CONTRACT_VARIABLE_KEYS.has(key)) {
      unknown.add(key);
      return match; // laissé visible, non vidé
    }
    const value = variables[key];
    if (value == null || value.trim() === "") {
      missing.add(key);
      return match;
    }
    return value;
  });
  return { text, unknown: [...unknown], missing: [...missing] };
}

export function unresolvedVariablesMessage(res: TemplateResolution): string | null {
  if (res.unknown.length === 0 && res.missing.length === 0) return null;
  const parts: string[] = [];
  if (res.unknown.length) {
    parts.push(`variables inconnues : ${res.unknown.map((k) => `{{${k}}}`).join(", ")}`);
  }
  if (res.missing.length) {
    parts.push(`variables non renseignées : ${res.missing.map((k) => `{{${k}}}`).join(", ")}`);
  }
  return `Le modèle contient des ${parts.join(" ; ")}. Corrigez le modèle ou complétez les informations avant de générer le contrat.`;
}
