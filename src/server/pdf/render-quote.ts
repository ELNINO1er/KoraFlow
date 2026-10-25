import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { formatCurrency } from "@/lib/formatting/currency";
import { sanitizeWinAnsi } from "@/lib/pdf/winansi";
import { DEFAULT_SECONDARY, templateSpec, tintOf, type QuoteDesign } from "@/lib/quotes/design";

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
  /** Mise en page du studio (devis). Absente : rendu historique inchangé (factures, anciens devis). */
  design?: QuoteDesign | null;
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

/** Variante de drawLogo à une position et une taille données (bandeau du modèle « classique »). */
async function drawLogoAt(document: PDFDocument, page: PDFPage, dataUri: string | null | undefined, x: number, y: number, size: number) {
  if (!dataUri) return false;
  const match = /^data:(image\/(?:png|jpeg));base64,([\s\S]+)$/.exec(dataUri);
  if (!match) return false;
  try {
    const bytes = Buffer.from(match[2]!, "base64");
    const image = match[1] === "image/png" ? await document.embedPng(bytes) : await document.embedJpg(bytes);
    const scaled = image.scaleToFit(size, size);
    page.drawImage(image, { x: x + (size - scaled.width) / 2, y: y + (size - scaled.height) / 2, width: scaled.width, height: scaled.height });
    return true;
  } catch (error) {
    console.warn("pdf.logo_ignored", { error: error instanceof Error ? error.message : "unknown" });
    return false;
  }
}

/** Générateur PDF pur JavaScript, compatible avec les runtimes Node sans Chromium. */
export async function renderQuotePdf(data: QuotePdfData): Promise<Buffer> {
  const document = await PDFDocument.create();
  const design = data.design ?? null;
  const serif = design?.font === "serif";
  const regular = await document.embedFont(serif ? StandardFonts.TimesRoman : StandardFonts.Helvetica);
  const bold = await document.embedFont(serif ? StandardFonts.TimesRomanBold : StandardFonts.HelveticaBold);
  let page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
  const money = (amount: number) => safeText(formatCurrency(amount, data.currency, data.locale));
  const date = new Intl.DateTimeFormat(data.locale, { dateStyle: "medium" });
  // Mise en page du studio : modèle (en-tête, tableau, total) + palette. Sans design : rendu historique.
  const spec = design ? templateSpec(design.template) : null;
  const accentHex = design ? design.accent : data.headerColor;
  const secondaryHex = design?.secondary ?? DEFAULT_SECONDARY;
  const accent = pdfColor(accentHex);
  const secondary = pdfColor(secondaryHex);
  const tableStyle = spec?.table ?? "filled";
  const headerColor =
    tableStyle === "secondary" ? secondary : tableStyle === "tint" ? pdfColor(tintOf(accentHex ?? "#12263A", 0.12)) : tableStyle === "line" ? rgb(1, 1, 1) : pdfColor(accentHex);
  const headerText =
    tableStyle === "secondary" ? contrastingText(secondaryHex) : tableStyle === "tint" ? secondary : tableStyle === "line" ? INK : contrastingText(accentHex);
  const ruleColor = spec ? (spec.filledTotal ? accent : secondary) : ACCENT;
  document.setTitle(`${data.docTitle ?? "DEVIS"} ${data.number}`);
  document.setAuthor(data.org.name);
  document.setCreator("Alymero");
  const title = data.docTitle ?? "DEVIS";
  const orgLines = [data.org.legalName, data.org.addressLine1, [data.org.city, data.org.country].filter(Boolean).join(", "), data.org.email, data.org.phone, data.org.taxId ? `N fiscal : ${data.org.taxId}` : null].filter(Boolean) as string[];
  const centered = (text: string, y: number, font: PDFFont, size: number, color = INK) => {
    const value = safeText(text);
    page.drawText(value, { x: (PAGE_WIDTH - font.widthOfTextAtSize(value, size)) / 2, y, font, size, color });
  };
  const header = spec?.header ?? null;
  const drawSidebarStrip = (target: PDFPage) => target.drawRectangle({ x: 0, y: 0, width: 10, height: PAGE_HEIGHT, color: accent });

  if (header === "band" || header === "dark") {
    // Bandeau plein (principale ou secondaire) : identité à gauche, titre à droite.
    const bandHex = header === "band" ? design!.accent : secondaryHex;
    const bandText = contrastingText(bandHex);
    page.drawRectangle({ x: 0, y: 700, width: PAGE_WIDTH, height: PAGE_HEIGHT - 700, color: pdfColor(bandHex) });
    const hasLogo = Boolean(data.org.logoDataUri);
    if (hasLogo) {
      page.drawRectangle({ x: MARGIN, y: 762, width: 48, height: 48, color: rgb(1, 1, 1) });
      await drawLogoAt(document, page, data.org.logoDataUri, MARGIN + 4, 766, 40);
    }
    const nameX = MARGIN + (hasLogo ? 60 : 0);
    page.drawText(safeText(data.org.name), { x: nameX, y: 792, font: bold, size: 18, color: bandText });
    orgLines.slice(0, 3).forEach((line, index) => page.drawText(safeText(line), { x: nameX, y: 776 - index * 12, font: regular, size: 8.5, color: bandText, opacity: 0.85 }));
    drawRight(page, title, PAGE_WIDTH - MARGIN, 790, bold, 22, header === "dark" ? accent : bandText);
    drawRight(page, `N ${data.number}`, PAGE_WIDTH - MARGIN, 770, regular, 9, bandText);
    drawRight(page, `Emis le ${date.format(data.issueDate)}`, PAGE_WIDTH - MARGIN, 756, regular, 9, bandText);
    if (data.expiryDate) drawRight(page, `Valable jusqu'au ${date.format(data.expiryDate)}`, PAGE_WIDTH - MARGIN, 742, regular, 9, bandText);
  } else if (header === "centered") {
    // Identité centrée, double filet fin à la couleur principale.
    const hasLogo = Boolean(data.org.logoDataUri) && (await drawLogoAt(document, page, data.org.logoDataUri, (PAGE_WIDTH - 40) / 2, 772, 40));
    const nameY = hasLogo ? 754 : 790;
    centered(data.org.name, nameY, bold, 17, secondary);
    centered([data.org.addressLine1, data.org.city, data.org.email].filter(Boolean).join(" - "), nameY - 15, regular, 8.5, MUTED);
    page.drawLine({ start: { x: MARGIN, y: 718 }, end: { x: PAGE_WIDTH - MARGIN, y: 718 }, thickness: 0.8, color: accent });
    page.drawLine({ start: { x: MARGIN, y: 714 }, end: { x: PAGE_WIDTH - MARGIN, y: 714 }, thickness: 0.8, color: accent });
    centered(title.split("").join(" "), 696, bold, 11, accent);
    centered([`N ${data.number}`, `Emis le ${date.format(data.issueDate)}`, data.expiryDate ? `Valable jusqu'au ${date.format(data.expiryDate)}` : null].filter(Boolean).join("   "), 680, regular, 8.5, MUTED);
  } else {
    if (header === "sidebar") drawSidebarStrip(page);
    if (header === "stripe") page.drawRectangle({ x: 0, y: PAGE_HEIGHT - 8, width: PAGE_WIDTH, height: 8, color: secondary });
    if (header === "block") page.drawRectangle({ x: PAGE_WIDTH - 210, y: 712, width: 210, height: PAGE_HEIGHT - 712, color: accent });

    const hasLogo = await drawLogo(document, page, data.org.logoDataUri);
    const brandY = hasLogo ? 730 : 785;
    page.drawText(safeText(data.org.name), { x: MARGIN, y: brandY, font: bold, size: 19, color: spec ? secondary : INK });
    orgLines.slice(0, 6).forEach((line, index) => page.drawText(safeText(line), { x: MARGIN, y: brandY - 16 - index * 12, font: regular, size: 8.5, color: MUTED }));

    const metaColor = header === "block" ? contrastingText(design!.accent) : MUTED;
    if (header === "split") {
      drawRight(page, title.charAt(0) + title.slice(1).toLowerCase(), PAGE_WIDTH - MARGIN, 782, bold, 28, accent);
    } else if (header === "sidebar") {
      drawRight(page, title, PAGE_WIDTH - MARGIN, 785, bold, 22, accent);
    } else if (header === "block") {
      drawRight(page, title, PAGE_WIDTH - MARGIN, 788, bold, 24, metaColor);
    } else if (header === "stripe") {
      const label = safeText(title);
      const w = bold.widthOfTextAtSize(label, 10) + 22;
      page.drawRectangle({ x: PAGE_WIDTH - MARGIN - w, y: 779, width: w, height: 20, color: accent });
      drawRight(page, label, PAGE_WIDTH - MARGIN - 11, 785, bold, 10, contrastingText(design!.accent));
    } else {
      drawRight(page, title, PAGE_WIDTH - MARGIN, 785, bold, header === "rule" ? 13 : 18, spec ? secondary : INK);
    }
    drawRight(page, `N ${data.number}`, PAGE_WIDTH - MARGIN, 766, regular, 9, metaColor);
    drawRight(page, `Emis le ${date.format(data.issueDate)}`, PAGE_WIDTH - MARGIN, 752, regular, 9, metaColor);
    if (data.expiryDate) drawRight(page, `Valable jusqu'au ${date.format(data.expiryDate)}`, PAGE_WIDTH - MARGIN, 738, regular, 9, metaColor);
    if (data.dueDate) drawRight(page, `Echeance : ${date.format(data.dueDate)}`, PAGE_WIDTH - MARGIN, 738, regular, 9, data.overdue ? ACCENT : MUTED);
    if (data.overdue) drawRight(page, "FACTURE EN RETARD", PAGE_WIDTH - MARGIN, 725, bold, 9, ACCENT);
    if (header === "split") page.drawRectangle({ x: MARGIN, y: 676, width: PAGE_WIDTH - MARGIN * 2, height: 3, color: accent });
    if (header === "rule" || header === "stripe") page.drawLine({ start: { x: MARGIN, y: 676 }, end: { x: PAGE_WIDTH - MARGIN, y: 676 }, thickness: 0.8, color: BORDER });
  }

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
  if (tableStyle === "line") page.drawLine({ start: { x: MARGIN, y: y - 7 }, end: { x: PAGE_WIDTH - MARGIN, y: y - 7 }, thickness: 1, color: secondary });
  page.drawText("Description", { x: columns.description + 6, y, font: bold, size: 8, color: headerText });
  drawRight(page, "Qte", columns.quantity + 22, y, bold, 8, headerText);
  drawRight(page, "P.U. HT", columns.unit + 50, y, bold, 8, headerText);
  drawRight(page, "TVA", columns.tax + 28, y, bold, 8, headerText);
  drawRight(page, "Total HT", columns.total - 6, y, bold, 8, headerText);
  y -= 30;

  for (const item of data.items) {
    const lines = wrapParagraphs(item.description, regular, 9, 285).filter(Boolean);
    const rowHeight = Math.max(24, lines.length * 11 + 10);
    if (y - rowHeight < 210) {
      page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      if (header === "sidebar") drawSidebarStrip(page);
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
    // Première ligne = intitulé (gras si un détail suit), lignes suivantes = détail.
    const firstBreak = item.description.indexOf("\n");
    const labelLines = firstBreak === -1 ? lines.length : wrapParagraphs(item.description.slice(0, firstBreak), regular, 9, 285).filter(Boolean).length;
    lines.forEach((line, index) => {
      const isDetail = firstBreak !== -1 && index >= labelLines;
      page.drawText(line, { x: columns.description + 6, y: y - index * 11, font: firstBreak !== -1 && !isDetail ? bold : regular, size: isDetail ? 8.5 : 9, color: isDetail ? MUTED : INK });
    });
    drawRight(page, String(item.quantity), columns.quantity + 22, y, regular, 9);
    drawRight(page, money(item.unitPriceMinor), columns.unit + 50, y, regular, 9);
    drawRight(page, `${item.taxRate} %`, columns.tax + 28, y, regular, 9);
    drawRight(page, money(item.unitPriceMinor * item.quantity), columns.total - 6, y, bold, 9);
    page.drawLine({ start: { x: MARGIN, y: y - rowHeight + 8 }, end: { x: PAGE_WIDTH - MARGIN, y: y - rowHeight + 8 }, thickness: 0.6, color: BORDER });
    y -= rowHeight;
  }

  const totalX = 345;
  let totalY = Math.min(y - 12, 340);
  const totalRow = (label: string, value: string, strong = false, color = strong ? INK : MUTED, valueColor = INK) => {
    page.drawText(label, { x: totalX, y: totalY, font: strong ? bold : regular, size: strong ? 11 : 9, color });
    drawRight(page, value, PAGE_WIDTH - MARGIN, totalY, strong ? bold : regular, strong ? 11 : 9, valueColor);
    totalY -= strong ? 22 : 16;
  };
  totalRow("Sous-total HT", money(data.subtotalMinor));
  if (data.discountMinor > 0) totalRow("Remise", `- ${money(data.discountMinor)}`);
  totalRow("TVA", money(data.taxMinor));
  totalY -= 4;
  if (spec?.filledTotal) {
    // Barre « Total TTC » pleine à la couleur principale (comme dans le studio).
    const onAccent = contrastingText(accentHex);
    page.drawRectangle({ x: totalX - 8, y: totalY - 7, width: PAGE_WIDTH - MARGIN - totalX + 16, height: 24, color: accent });
    totalRow("Total TTC", money(data.totalMinor), true, onAccent, onAccent);
    totalY -= 4;
  } else {
    page.drawLine({ start: { x: totalX, y: totalY + 18 }, end: { x: PAGE_WIDTH - MARGIN, y: totalY + 18 }, thickness: 1, color: ruleColor });
    totalRow("Total TTC", money(data.totalMinor), true);
  }
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
