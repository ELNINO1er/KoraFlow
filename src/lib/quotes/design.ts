import { z } from "zod";

/**
 * Mise en page d'un devis, choisie dans le studio de document : modèle,
 * palette (couleur principale + couleur secondaire) et police. Partagée par le
 * studio (aperçu A4) et le moteur PDF pour que les deux rendus restent alignés.
 */

/** Style d'en-tête d'un modèle. */
export type HeaderStyle =
  | "band" // bandeau plein à la couleur principale
  | "split" // identité à gauche, grand titre coloré à droite, filet épais
  | "rule" // sobre, filet fin gris
  | "centered" // identité centrée, double filet fin
  | "sidebar" // bande verticale colorée sur le bord gauche
  | "dark" // bandeau couleur secondaire, titre à la couleur principale
  | "stripe" // bande fine secondaire en haut, pastille « DEVIS »
  | "block"; // bloc coloré en coin supérieur droit

/** Style de l'en-tête du tableau des lignes. */
export type TableStyle = "filled" | "secondary" | "tint" | "line";

export interface QuoteTemplateSpec {
  value: QuoteTemplate;
  label: string;
  hint: string;
  header: HeaderStyle;
  table: TableStyle;
  /** Barre « Total TTC » pleine (sinon simple filet). */
  filledTotal: boolean;
}

export const QUOTE_TEMPLATE_VALUES = ["classic", "modern", "minimal", "elegant", "sidebar", "contrast", "corporate", "creative"] as const;
export type QuoteTemplate = (typeof QUOTE_TEMPLATE_VALUES)[number];

export const QUOTE_TEMPLATES: QuoteTemplateSpec[] = [
  { value: "classic", label: "Classique", hint: "Bandeau coloré", header: "band", table: "filled", filledTotal: true },
  { value: "modern", label: "Moderne", hint: "Grand titre coloré", header: "split", table: "tint", filledTotal: true },
  { value: "minimal", label: "Minimal", hint: "Sobre, noir et blanc", header: "rule", table: "line", filledTotal: false },
  { value: "elegant", label: "Élégant", hint: "Centré, filets fins", header: "centered", table: "line", filledTotal: false },
  { value: "sidebar", label: "Bande latérale", hint: "Marge colorée", header: "sidebar", table: "tint", filledTotal: true },
  { value: "contrast", label: "Contraste", hint: "En-tête sombre", header: "dark", table: "secondary", filledTotal: true },
  { value: "corporate", label: "Corporate", hint: "Bande fine et pastille", header: "stripe", table: "secondary", filledTotal: false },
  { value: "creative", label: "Créatif", hint: "Bloc en coin", header: "block", table: "tint", filledTotal: true },
];

export function templateSpec(value: QuoteTemplate): QuoteTemplateSpec {
  return QUOTE_TEMPLATES.find((t) => t.value === value) ?? QUOTE_TEMPLATES[0]!;
}

export const QUOTE_FONTS = [
  { value: "inter", label: "Inter" },
  { value: "manrope", label: "Manrope" },
  { value: "serif", label: "Serif" },
] as const;

/** Palettes prêtes à l'emploi : couleur principale (accent) + secondaire (en-têtes sombres, texte fort). */
export const QUOTE_PALETTES = [
  { id: "alymero", label: "Alymero", accent: "#2F855A", secondary: "#12263A" },
  { id: "terracotta", label: "Terracotta", accent: "#C8553D", secondary: "#12263A" },
  { id: "foret", label: "Forêt", accent: "#1F5C43", secondary: "#0E2A1F" },
  { id: "ocean", label: "Océan", accent: "#0E6BA8", secondary: "#0B2545" },
  { id: "lagon", label: "Lagon", accent: "#0F8B8D", secondary: "#143642" },
  { id: "prune", label: "Prune", accent: "#7B2CBF", secondary: "#240046" },
  { id: "rubis", label: "Rubis", accent: "#C9184A", secondary: "#3A0A1A" },
  { id: "soleil", label: "Soleil", accent: "#D97706", secondary: "#3D2C1E" },
  { id: "ardoise", label: "Ardoise", accent: "#475569", secondary: "#0F172A" },
  { id: "noir", label: "Monochrome", accent: "#1F2937", secondary: "#111111" },
] as const;

/** Conservé pour compatibilité : les couleurs principales des palettes. */
export const QUOTE_ACCENTS = QUOTE_PALETTES.map((p) => ({ value: p.accent, label: p.label }));

const hex = z.string().regex(/^#[0-9a-f]{6}$/i, "Couleur invalide.");

export const quoteDesignSchema = z.object({
  template: z.enum(QUOTE_TEMPLATE_VALUES),
  accent: hex,
  /** Absente sur les devis antérieurs : bleu nuit par défaut. */
  secondary: hex.optional(),
  font: z.enum(["inter", "manrope", "serif"]),
});

export type QuoteDesign = z.infer<typeof quoteDesignSchema>;

export const DEFAULT_SECONDARY = "#12263A";
export const DEFAULT_QUOTE_DESIGN: QuoteDesign = { template: "classic", accent: "#2F855A", secondary: DEFAULT_SECONDARY, font: "inter" };

/** Lit une valeur JSON stockée ; null si absente ou invalide (rendu historique). */
export function parseQuoteDesign(value: unknown): QuoteDesign | null {
  const result = quoteDesignSchema.safeParse(value);
  return result.success ? result.data : null;
}

/** Palette prédéfinie correspondant au design, ou null si les couleurs sont personnalisées. */
export function matchingPalette(design: QuoteDesign) {
  const secondary = (design.secondary ?? DEFAULT_SECONDARY).toLowerCase();
  return QUOTE_PALETTES.find((p) => p.accent.toLowerCase() === design.accent.toLowerCase() && p.secondary.toLowerCase() === secondary) ?? null;
}

/** Teinte très claire d'une couleur (mélange avec du blanc), pour les fonds de tableau. */
export function tintOf(color: string, strength = 0.1): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return "#F1F5F2";
  const n = parseInt(m[1]!, 16);
  const mix = (c: number) => Math.round(255 - (255 - c) * strength);
  const r = mix((n >> 16) & 255);
  const g = mix((n >> 8) & 255);
  const b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1).toUpperCase()}`;
}

/** Texte lisible (blanc ou bleu nuit) sur un fond de la couleur donnée. */
export function readableOn(color: string): string {
  const m = /^#([0-9a-f]{6})$/i.exec(color);
  if (!m) return "#FFFFFF";
  const n = parseInt(m[1]!, 16);
  const lum = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return lum > 0.62 ? "#12263A" : "#FFFFFF";
}
