/** Garde-fous communs aux endpoints d'upload Excel. */

/** Taille maximale d'un fichier d'import (anti-abus / anti-décompression excessive). */
export const MAX_IMPORT_FILE_SIZE = 5 * 1024 * 1024; // 5 Mo

export function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const expected = new URL(process.env.APP_URL || request.url).origin;
  return origin === expected;
}

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

/** Vérifie l'extension .xlsx (le .xls hérité n'est PAS pris en charge). */
export function isXlsxFile(file: File): boolean {
  const name = file.name.toLowerCase();
  if (!name.endsWith(".xlsx")) return false;
  // Le type MIME n'est pas fiable selon les navigateurs ; on tolère vide.
  return file.type === "" || file.type === XLSX_MIME || file.type === "application/octet-stream";
}

export const XLSX_CONTENT_TYPE = XLSX_MIME;
