import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { formatCurrency } from "@/lib/formatting/currency";
import { sanitizeWinAnsi } from "@/lib/pdf/winansi";

export interface QuotePdfData {
  docTitle?: string;
  org: { name: string; legalName?: string | null; email?: string | null; phone?: string | null; addressLine1?: string | null; city?: string | null; country?: string | null; taxId?: string | null; logoDataUri?: string | null };
  contact: { name: string; email?: string | null };
  number: string;
  issueDate: Date;
  expiryDate?: Date | null;
  dueDate?: Date | null;
  currency: string;
  locale: string;
  items: Array<{ description: string; quantity: number; unitPriceMinor: number; taxRate: number }>;
  subtotalMinor: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  depositMinor: number;
  /** Montant déjà encaissé (factures). Si défini, le PDF affiche payé + solde dû. */
  paidMinor?: number | null;
  /** Indicateur de retard dérivé (factures) : échéance passée + solde dû. */
  overdue?: boolean;
  notes?: string | null;
  terms?: string | null;
  /** Objet / titre du document. */
  docSubject?: string | null;
  introduction?: string | null;
  /** Sections rédactionnelles [{ heading, body }]. */
  sections?: { heading: string; body: string }[] | null;
  headerColor?: string | null;
  footerColor?: string | null;
  footerText?: string | null;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const INK = rgb(18 / 255, 38 / 255, 58 / 255);
const MUTED = rgb(102 / 255, 112 / 255, 133 / 255);
const BORDER = rgb(228 / 255, 231 / 255, 236 / 255);
const ACCENT = rgb(200 / 255, 85 / 255, 61 / 255);

function pdfColor(value: string | null | undefined, fallback = INK) {
  const match = /^#([0-9a-f]{6})$/i.exec(value ?? "");
  if (!match) return fallback;
  const hex = match[1]!;
  return rgb(parseInt(hex.slice(0, 2), 16) / 255, parseInt(hex.slice(2, 4), 16) / 255, parseInt(hex.slice(4, 6), 16) / 255);
}

function contrastingText(value: string | null | undefined) {
  const match = /^#([0-9a-f]{6})$/i.exec(value ?? "");
  if (!match) return rgb(1, 1, 1);
  const hex = match[1]!;
  const [r, g, b] = [0, 2, 4].map((offset) => parseInt(hex.slice(offset, offset + 2), 16));
  return (0.299 * r! + 0.587 * g! + 0.114 * b!) / 255 > 0.62 ? INK : rgb(1, 1, 1);
}

// Conserve le fran\u00e7ais (accents, \u0153/\u0152, \u20ac, guillemets typographiques) via WinAnsi ;
// seuls les caract\u00e8res r\u00e9ellement non repr\u00e9sentables deviennent \u00ab ? \u00bb (l'envoi
// est normalement bloqu\u00e9 en amont, cf. collectUnsupportedCharacters).
function safeText(value: string | null | undefined) {
  return sanitizeWinAnsi(value);
}

/** D\u00e9coupe un mot trop long pour la largeur donn\u00e9e (\u00e9vite tout d\u00e9bordement). */
function breakLongWord(word: string, font: PDFFont, size: number, maxWidth: number): string[] {
  if (font.widthOfTextAtSize(word, size) <= maxWidth) return [word];
  const pieces: string[] = [];
  let chunk = "";
  for (const ch of word) {
    const candidate = chunk + ch;
    if (chunk && font.widthOfTextAtSize(candidate, size) > maxWidth) {
      pieces.push(chunk);
      chunk = ch;
    } else {
      chunk = candidate;
    }
  }
  if (chunk) pieces.push(chunk);
  return pieces;
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = safeText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const rawWord of words) {
    for (const word of breakLongWord(rawWord, font, size, maxWidth)) {
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
      else { if (line) lines.push(line); line = word; }
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

/** Comme wrapText mais PR\u00c9SERVE les paragraphes (retours \u00e0 la ligne explicites). */
function wrapParagraphs(text: string, font: PDFFont, size: number, maxWidth: number) {
  const out: string[] = [];
  for (const paragraph of safeText(text).split(/\r?\n/)) {
    if (!paragraph.trim()) { out.push(""); continue; }
    out.push(...wrapText(paragraph, font, size, maxWidth));
  }
  return out;
}

function drawRight(page: PDFPage, text: string, x: number, y: number, font: PDFFont, size: number, color = INK) {
  const value = safeText(text);
  page.drawText(value, { x: x - font.widthOfTextAtSize(value, size), y, font, size, color });
}

async function drawLogo(document: PDFDocument, page: PDFPage, dataUri?: string | null) {
  if (!dataUri) return false;
  const match = /^data:(image\/(?:png|jpeg));base64,([\s\S]+)$/.exec(dataUri);
  if (!match) return false;
  try {
    const bytes = Buffer.from(match[2]!, "base64");
    const image = match[1] === "image/png" ? await document.embedPng(bytes) : await document.embedJpg(bytes);
    const scaled = image.scaleToFit(54, 54);
    page.drawImage(image, { x: MARGIN, y: 746, width: scaled.width, height: scaled.height });
    return true;
  } catch (error) {
    console.warn("pdf.logo_ignored", { error: error instanceof Error ? error.message : "unknown" });
    return false;
  }
}

/** Générateur PDF pur JavaScript, compatible avec les runtimes Node sans Chromium. */
export async function renderQuotePdf(data: QuotePdfData): Promise<Buffer> {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const money = (amount: number) => safeText(formatCurrency(amount, data.currency, data.locale));
  const date = new Intl.DateTimeFormat(data.locale, { dateStyle: "medium" });
  const headerColor = pdfColor(data.headerColor);
  const headerText = contrastingText(data.headerColor);
  document.setTitle(`${data.docTitle ?? "DEVIS"} ${data.number}`);
  document.setAuthor(data.org.name);
  document.setCreator("Alymero");
  const hasLogo = await drawLogo(document, page, data.org.logoDataUri);

  const brandY = hasLogo ? 730 : 785;
  page.drawText(safeText(data.org.name), { x: MARGIN, y: brandY, font: bold, size: 19, color: INK });
  const orgLines = [data.org.legalName, data.org.addressLine1, [data.org.city, data.org.country].filter(Boolean).join(", "), data.org.email, data.org.phone, data.org.taxId ? `N fiscal : ${data.org.taxId}` : null].filter(Boolean) as string[];
  orgLines.slice(0, 6).forEach((line, index) => page.drawText(safeText(line), { x: MARGIN, y: brandY - 16 - index * 12, font: regular, size: 8.5, color: MUTED }));

  const title = data.docTitle ?? "DEVIS";
  drawRight(page, title, PAGE_WIDTH - MARGIN, 785, bold, 18);
  drawRight(page, `N ${data.number}`, PAGE_WIDTH - MARGIN, 766, regular, 9, MUTED);
  drawRight(page, `Emis le ${date.format(data.issueDate)}`, PAGE_WIDTH - MARGIN, 752, regular, 9, MUTED);
  if (data.expiryDate) drawRight(page, `Valable jusqu'au ${date.format(data.expiryDate)}`, PAGE_WIDTH - MARGIN, 738, regular, 9, MUTED);
  if (data.dueDate) drawRight(page, `Echeance : ${date.format(data.dueDate)}`, PAGE_WIDTH - MARGIN, 738, regular, 9, data.overdue ? ACCENT : MUTED);
  if (data.overdue) drawRight(page, "FACTURE EN RETARD", PAGE_WIDTH - MARGIN, 725, bold, 9, ACCENT);

  page.drawText("ADRESSE A", { x: MARGIN, y: 660, font: bold, size: 8, color: MUTED });
  page.drawText(safeText(data.contact.name), { x: MARGIN, y: 644, font: bold, size: 10, color: INK });
  if (data.contact.email) page.drawText(safeText(data.contact.email), { x: MARGIN, y: 630, font: regular, size: 9, color: MUTED });
  // Objet / titre (une ligne, au-dessus du tableau).
  if (data.docSubject) {
    const subject = wrapText(`Objet : ${data.docSubject}`, bold, 9.5, PAGE_WIDTH - MARGIN * 2)[0] ?? "";
    page.drawText(subject, { x: MARGIN, y: 614, font: bold, size: 9.5, color: INK });
  }

  const columns = { description: MARGIN, quantity: 325, unit: 370, tax: 437, total: PAGE_WIDTH - MARGIN };
  let y = 590;
  page.drawRectangle({ x: MARGIN, y: y - 7, width: PAGE_WIDTH - MARGIN * 2, height: 24, color: headerColor });
  page.drawText("Description", { x: columns.description + 6, y, font: bold, size: 8, color: headerText });
  drawRight(page, "Qte", columns.quantity + 22, y, bold, 8, headerText);
  drawRight(page, "P.U. HT", columns.unit + 50, y, bold, 8, headerText);
  drawRight(page, "TVA", columns.tax + 28, y, bold, 8, headerText);
  drawRight(page, "Total HT", columns.total - 6, y, bold, 8, headerText);
  y -= 30;

  for (const item of data.items) {
    const lines = wrapText(item.description, regular, 9, 285);
    const rowHeight = Math.max(24, lines.length * 11 + 10);
    if (y - rowHeight < 210) {
      page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = 780;
      page.drawText(`${safeText(title)} ${safeText(data.number)} - suite`, { x: MARGIN, y: 805, font: bold, size: 12, color: INK });
      page.drawRectangle({ x: MARGIN, y: y - 7, width: PAGE_WIDTH - MARGIN * 2, height: 24, color: headerColor });
      page.drawText("Description", { x: columns.description + 6, y, font: bold, size: 8, color: headerText });
      drawRight(page, "Qte", columns.quantity + 22, y, bold, 8, headerText);
      drawRight(page, "P.U. HT", columns.unit + 50, y, bold, 8, headerText);
      drawRight(page, "TVA", columns.tax + 28, y, bold, 8, headerText);
      drawRight(page, "Total HT", columns.total - 6, y, bold, 8, headerText);
      y -= 30;
    }
    lines.forEach((line, index) => page.drawText(line, { x: columns.description + 6, y: y - index * 11, font: regular, size: 9, color: INK }));
    drawRight(page, String(item.quantity), columns.quantity + 22, y, regular, 9);
    drawRight(page, money(item.unitPriceMinor), columns.unit + 50, y, regular, 9);
    drawRight(page, `${item.taxRate} %`, columns.tax + 28, y, regular, 9);
    drawRight(page, money(item.unitPriceMinor * item.quantity), columns.total - 6, y, bold, 9);
    page.drawLine({ start: { x: MARGIN, y: y - rowHeight + 8 }, end: { x: PAGE_WIDTH - MARGIN, y: y - rowHeight + 8 }, thickness: 0.6, color: BORDER });
    y -= rowHeight;
  }

  const totalX = 345;
  let totalY = Math.min(y - 12, 340);
  const totalRow = (label: string, value: string, strong = false) => {
    page.drawText(label, { x: totalX, y: totalY, font: strong ? bold : regular, size: strong ? 11 : 9, color: strong ? INK : MUTED });
    drawRight(page, value, PAGE_WIDTH - MARGIN, totalY, strong ? bold : regular, strong ? 11 : 9);
    totalY -= strong ? 22 : 16;
  };
  totalRow("Sous-total HT", money(data.subtotalMinor));
  if (data.discountMinor > 0) totalRow("Remise", `- ${money(data.discountMinor)}`);
  totalRow("TVA", money(data.taxMinor));
  page.drawLine({ start: { x: totalX, y: totalY + 14 }, end: { x: PAGE_WIDTH - MARGIN, y: totalY + 14 }, thickness: 1, color: ACCENT });
  totalY -= 4;
  totalRow("Total TTC", money(data.totalMinor), true);
  if (data.depositMinor > 0) { totalRow("Acompte demande", money(data.depositMinor)); totalRow("Reste a payer", money(data.totalMinor - data.depositMinor)); }
  // Factures : montant déjà encaissé et solde réellement dû.
  if (data.paidMinor != null) {
    totalRow("Deja paye", money(data.paidMinor));
    totalRow("Solde du", money(Math.max(0, data.totalMinor - data.paidMinor)), true);
  }

  // Notes et conditions : paginées si nécessaire — AUCUNE troncature silencieuse.
  let noteY = Math.min(totalY - 10, 165);
  const ensureRoom = (minY: number) => {
    if (noteY < minY) {
      page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      noteY = 790;
    }
  };
  const blocks: [string, string | null | undefined][] = [
    ["INTRODUCTION", data.introduction],
    ...(data.sections ?? []).map((s): [string, string] => [s.heading.toUpperCase(), s.body]),
    ["NOTES", data.notes],
    ["CONDITIONS", data.terms],
  ];
  for (const [label, content] of blocks) {
    if (!content) continue;
    ensureRoom(80);
    page.drawText(label, { x: MARGIN, y: noteY, font: bold, size: 8, color: MUTED });
    noteY -= 14;
    for (const line of wrapParagraphs(content, regular, 8.5, 500)) {
      ensureRoom(70);
      if (line) page.drawText(line, { x: MARGIN, y: noteY, font: regular, size: 8.5, color: INK });
      noteY -= line ? 11 : 6;
    }
    noteY -= 6;
  }

  const footerColor = pdfColor(data.footerColor, rgb(245 / 255, 247 / 255, 250 / 255));
  const footerTextColor = data.footerColor ? contrastingText(data.footerColor) : MUTED;
  const footer = safeText(data.footerText?.trim() || `${data.org.name} - Document edite via Alymero.`);
  page.drawRectangle({ x: 0, y: 0, width: PAGE_WIDTH, height: 48, color: footerColor });
  const footerLines = wrapText(footer, regular, 8, PAGE_WIDTH - MARGIN * 2).slice(0, 2);
  footerLines.forEach((line, index) => page.drawText(line, { x: (PAGE_WIDTH - regular.widthOfTextAtSize(line, 8)) / 2, y: 27 - index * 11, font: regular, size: 8, color: footerTextColor }));
  return Buffer.from(await document.save({ useObjectStreams: false }));
}
