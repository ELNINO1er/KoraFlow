import type { AmountKind } from "@/lib/quotes/totals";
import type { QuoteDesign } from "@/lib/quotes/design";

export interface StudioContact {
  id: string;
  firstName: string;
  lastName: string | null;
  companyName: string | null;
  email: string | null;
  phone: string | null;
}

export interface StudioService {
  id: string;
  name: string;
  description: string | null;
  priceMinor: number;
  taxRate: number;
  unit: string;
}

export interface StudioOrganization {
  id: string;
  name: string;
  legalName: string | null;
  hasLogo: boolean;
  email: string | null;
  phone: string | null;
  addressLine1: string | null;
  city: string | null;
  country: string | null;
  taxId: string | null;
}

export interface StudioLine {
  key: number;
  serviceId: string | null;
  /** Intitulé (1re ligne de la description stockée). */
  label: string;
  /** Détail facultatif (lignes suivantes de la description stockée). */
  detail: string;
  quantity: number;
  unitPriceMajor: number;
  taxRate: number;
}

export interface StudioSection {
  key: number;
  heading: string;
  body: string;
}

/** État complet du document édité dans le studio (source de l'annuler/rétablir). */
export interface StudioDoc {
  contactId: string;
  title: string;
  introduction: string;
  sections: StudioSection[];
  lines: StudioLine[];
  notes: string;
  terms: string;
  expiryDate: string;
  discountType: AmountKind | null;
  discountValue: number;
  depositType: AmountKind | null;
  depositValue: number;
  design: QuoteDesign;
}

/** Devis existant (brouillon) ouvert dans le studio. */
export interface StudioQuote {
  id: string;
  number: string;
}

export type SaveState =
  | { kind: "idle" }
  | { kind: "saving" }
  | { kind: "saved"; at: number }
  | { kind: "incomplete"; message: string }
  | { kind: "error"; message: string };

/** Blocs rédactionnels proposés (panneau « Blocs » et menu « / »). */
export const BLOCK_PRESETS: { id: string; glyph: string; label: string; hint: string; heading?: string; body?: string; line?: true }[] = [
  { id: "paragraph", glyph: "T", label: "Paragraphe", hint: "Texte libre", heading: "Précisions", body: "" },
  { id: "deliverables", glyph: "✓", label: "Livrables", hint: "Ce qui est remis au client", heading: "Livrables", body: "" },
  { id: "planning", glyph: "⧗", label: "Planning", hint: "Étapes et délais", heading: "Planning prévisionnel", body: "Semaine 1–2 : ateliers et maquettes\nSemaine 3–5 : réalisation\nSemaine 6 : recette et livraison" },
  { id: "schedule", glyph: "₣", label: "Échéancier de paiement", hint: "Acompte et soldes", heading: "Échéancier", body: "Acompte à la signature, solde à la livraison." },
  { id: "exclusions", glyph: "∅", label: "Exclusions", hint: "Hors périmètre", heading: "Hors périmètre", body: "" },
  { id: "confidentiality", glyph: "§", label: "Clause de confidentialité", hint: "Clause type à relire", heading: "Confidentialité", body: "Les parties s’engagent à garder confidentielles les informations échangées dans le cadre de cette mission." },
  { id: "line", glyph: "≡", label: "Ligne de prestation", hint: "Ajoute une ligne vide", line: true },
];
