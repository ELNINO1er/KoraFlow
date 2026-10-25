/**
 * Variables utilisables dans les textes d'un devis (objet, introduction,
 * sections, notes, conditions). Syntaxe `{client.prenom}` ; elles sont
 * remplacées au rendu (PDF, page publique). Une variable inconnue est laissée
 * telle quelle, pour rester visible plutôt que disparaître silencieusement.
 */
export const QUOTE_VARIABLES = [
  { key: "client.prenom", label: "Prénom du client" },
  { key: "client.nom", label: "Nom complet du client" },
  { key: "client.entreprise", label: "Entreprise du client" },
  { key: "devis.numero", label: "Numéro du devis" },
  { key: "devis.total", label: "Total TTC" },
  { key: "devis.validite", label: "Date de validité" },
  { key: "organisation.nom", label: "Nom de votre organisation" },
] as const;

export type QuoteVariableKey = (typeof QUOTE_VARIABLES)[number]["key"];
export type QuoteVariableValues = Partial<Record<QuoteVariableKey, string>>;

const TOKEN_RE = /\{\s*([a-z]+\.[a-z]+)\s*\}/g;

export function resolveQuoteVariables(text: string, values: QuoteVariableValues): string;
export function resolveQuoteVariables(text: string | null | undefined, values: QuoteVariableValues): string | null;
export function resolveQuoteVariables(text: string | null | undefined, values: QuoteVariableValues): string | null {
  if (text == null) return null;
  return text.replace(TOKEN_RE, (match, key: string) => {
    const value = values[key as QuoteVariableKey];
    return value ? value : match;
  });
}

/** Valeurs des variables d'un devis, à partir des données déjà chargées. */
export function quoteVariableValues(input: {
  contact: { firstName: string; lastName: string | null; companyName: string | null };
  number: string;
  totalLabel: string;
  expiryDate: Date | null;
  organizationName: string;
  locale: string;
}): QuoteVariableValues {
  const fullName = `${input.contact.firstName} ${input.contact.lastName ?? ""}`.trim();
  return {
    "client.prenom": input.contact.firstName,
    "client.nom": fullName,
    "client.entreprise": input.contact.companyName ?? fullName,
    "devis.numero": input.number,
    "devis.total": input.totalLabel,
    "devis.validite": input.expiryDate ? new Intl.DateTimeFormat(input.locale, { dateStyle: "long" }).format(input.expiryDate) : undefined,
    "organisation.nom": input.organizationName,
  };
}
