import "server-only";
import ExcelJS from "exceljs";

/**
 * Lecture/écriture de classeurs .xlsx. Le fichier importé est une ENTRÉE NON
 * FIABLE : les cellules contenant des formules sont détectées et refusées
 * (aucune formule, macro ou lien externe n'est jamais évalué). exceljs ne
 * calcule pas les formules ; nous lisons uniquement les valeurs/texte.
 */

export const INSTRUCTIONS_SHEET = "Instructions";

export interface ParsedSheet {
  sheetNames: string[];
  sheetName: string;
  header: string[];
  /** Lignes de données (hors en-tête), avec le numéro de ligne Excel d'origine. */
  rows: { excelRow: number; cells: string[] }[];
  /** Vrai si au moins une cellule de formule a été rencontrée (dans la feuille lue). */
  hasFormulas: boolean;
}

function cellText(cell: ExcelJS.Cell): { text: string; isFormula: boolean } {
  const isFormula =
    cell.type === ExcelJS.ValueType.Formula ||
    (cell.formula != null && cell.formula !== "");
  // `cell.text` rend la valeur affichée (texte), ce qui préserve les zéros
  // initiaux des téléphones saisis en texte.
  const text = (cell.text ?? "").toString().trim();
  return { text, isFormula };
}

/** Charge un classeur et extrait les lignes de la feuille de données choisie. */
export async function parseWorkbook(
  buffer: Buffer | ArrayBuffer,
  preferredSheet?: string,
): Promise<ParsedSheet> {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(buffer as ArrayBuffer);
  const sheetNames = wb.worksheets.map((w) => w.name);

  // Feuille cible : la feuille demandée, sinon la première feuille qui n'est pas
  // la feuille d'instructions/exemples.
  const sheet =
    (preferredSheet && wb.worksheets.find((w) => w.name === preferredSheet)) ||
    wb.worksheets.find((w) => w.name !== INSTRUCTIONS_SHEET) ||
    wb.worksheets[0];
  if (!sheet) {
    return { sheetNames, sheetName: "", header: [], rows: [], hasFormulas: false };
  }

  let hasFormulas = false;
  const matrix: { excelRow: number; cells: string[] }[] = [];
  sheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
    const cells: string[] = [];
    let maxCol = 0;
    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
      const { text, isFormula } = cellText(cell);
      if (isFormula) hasFormulas = true;
      cells[colNumber - 1] = text;
      maxCol = Math.max(maxCol, colNumber);
    });
    for (let i = 0; i < maxCol; i += 1) cells[i] = cells[i] ?? "";
    matrix.push({ excelRow: rowNumber, cells });
  });

  const headerEntry = matrix.shift();
  const header = headerEntry ? headerEntry.cells : [];
  // Ignore les lignes entièrement vides.
  const rows = matrix.filter((r) => r.cells.some((c) => c && c.trim() !== ""));
  return { sheetNames, sheetName: sheet.name, header, rows, hasFormulas };
}

export interface ExportColumn {
  header: string;
  width?: number;
  /** Force le format texte (téléphones, références) pour préserver les zéros. */
  text?: boolean;
}

export interface ExportSheet {
  name: string;
  columns: ExportColumn[];
  rows: (string | number | null)[][];
}

/**
 * Écrit un classeur .xlsx. Les colonnes `text: true` sont en format texte et les
 * valeurs chaînes sont écrites comme TEXTE (jamais comme formule). Protection
 * anti-injection : une chaîne commençant par = + - @ est préfixée d'une
 * apostrophe neutralisante.
 */
export async function buildWorkbook(sheets: ExportSheet[]): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "KoraFlow";
  for (const spec of sheets) {
    const ws = wb.addWorksheet(spec.name);
    ws.columns = spec.columns.map((c) => ({ header: c.header, width: c.width ?? 22 }));
    ws.getRow(1).font = { bold: true };
    for (const row of spec.rows) {
      const added = ws.addRow(
        row.map((value, i) => {
          if (typeof value === "string") {
            return spec.columns[i]?.text ? neutralizeFormula(value) : neutralizeFormula(value);
          }
          return value ?? null;
        }),
      );
      spec.columns.forEach((c, i) => {
        if (c.text) added.getCell(i + 1).numFmt = "@";
      });
    }
  }
  const out = await wb.xlsx.writeBuffer();
  return Buffer.from(out as ArrayBuffer);
}

/** Neutralise une chaîne susceptible d'être interprétée comme formule. */
function neutralizeFormula(value: string): string {
  return /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
}
