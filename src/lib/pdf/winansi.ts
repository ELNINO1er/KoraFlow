/**
 * Jeu de caractères réellement représentables par les polices standard pdf-lib
 * (Helvetica…), qui utilisent l'encodage WinAnsi (Windows-1252).
 *
 * WinAnsi couvre INTÉGRALEMENT le français : lettres accentuées (à â ä ç é è ê
 * ë î ï ô ö ù û ü ÿ), ligatures œ/Œ, symbole €, guillemets typographiques, etc.
 * Les scripts non couverts (arabe, cyrillique, CJK…) ne sont PAS représentables
 * et doivent être signalés et bloqués AVANT émission plutôt que remplacés
 * silencieusement par « ? ».
 */

// Mapping Windows-1252 de la plage 0x80–0x9F vers l'Unicode (le reste 0xA0–0xFF
// correspond à Latin-1 U+00A0–U+00FF).
const CP1252_HIGH = [
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
];

const WINANSI_CODEPOINTS: ReadonlySet<number> = (() => {
  const set = new Set<number>();
  for (let c = 0x20; c <= 0x7e; c += 1) set.add(c); // ASCII imprimable
  for (let c = 0xa0; c <= 0xff; c += 1) set.add(c); // Latin-1 supplément
  for (const cp of CP1252_HIGH) set.add(cp); // spécifiques CP1252 (œ, Œ, €, …)
  return set;
})();

/** Caractères de mise en forme tolérés (gérés par la pagination, non « dessinés »). */
const LAYOUT_CHARS = new Set(["\n", "\r", "\t"]);

export function isWinAnsiEncodable(codePoint: number): boolean {
  return WINANSI_CODEPOINTS.has(codePoint);
}

/**
 * Rend un texte sûr pour le dessin pdf-lib SANS perdre le français : on
 * normalise d'abord quelques espaces fins non encodables, on conserve tout
 * caractère WinAnsi (accents, œ/Œ, €, guillemets typographiques) et on remplace
 * uniquement les caractères réellement non représentables par « ? ». La
 * détection en amont (collectUnsupportedCharacters) doit avoir bloqué l'émission
 * avant d'en arriver là ; ce remplacement n'est qu'un ultime garde-fou.
 */
export function sanitizeWinAnsi(value: string | null | undefined): string {
  if (!value) return "";
  // Espaces fins / insécables étroits non encodables → espace insécable WinAnsi.
  const normalized = value.replace(/[  ]/g, " ");
  let out = "";
  for (const ch of normalized) {
    if (LAYOUT_CHARS.has(ch)) {
      out += ch;
      continue;
    }
    const cp = ch.codePointAt(0)!;
    out += isWinAnsiEncodable(cp) ? ch : "?";
  }
  return out;
}

/**
 * Renvoie la liste (distincte, ordonnée) des caractères NON représentables dans
 * les textes fournis — hors caractères de mise en forme. Utilisé pour bloquer
 * l'émission d'un document avec un message explicite.
 */
export function collectUnsupportedCharacters(texts: Array<string | null | undefined>): string[] {
  const found = new Set<string>();
  for (const text of texts) {
    if (!text) continue;
    const normalized = text.replace(/[  ]/g, " ");
    for (const ch of normalized) {
      if (LAYOUT_CHARS.has(ch)) continue;
      const cp = ch.codePointAt(0)!;
      if (!isWinAnsiEncodable(cp)) found.add(ch);
    }
  }
  return [...found];
}

/** Message d'erreur prêt à l'emploi listant les caractères non pris en charge. */
export function unsupportedCharactersMessage(chars: string[]): string {
  const preview = chars.slice(0, 20).join(" ");
  return (
    "Le document contient des caractères non pris en charge par le PDF " +
    `(police standard, alphabet latin) : ${preview}. ` +
    "Remplacez-les avant l'envoi. Les alphabets non latins ne sont pas encore supportés."
  );
}
