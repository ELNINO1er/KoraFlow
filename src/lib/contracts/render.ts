/**
 * Substitution de variables dans un modèle de contrat.
 * Les variables sont de la forme {{cle}} (espaces internes tolérés : {{ cle }}).
 * Une variable inconnue est remplacée par une chaîne vide.
 */
export function renderTemplate(
  body: string,
  variables: Record<string, string>,
): string {
  return body.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_match, key: string) => {
    return variables[key] ?? "";
  });
}

/** Liste des variables référencées dans un modèle (pour aide à la saisie). */
export function extractVariables(body: string): string[] {
  const found = new Set<string>();
  for (const m of body.matchAll(/\{\{\s*([\w.]+)\s*\}\}/g)) {
    if (m[1]) found.add(m[1]);
  }
  return [...found];
}
