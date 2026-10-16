import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFPage, type PDFFont } from "pdf-lib";
import { formatCurrency } from "@/lib/formatting/currency";

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
  notes?: string | null;
  terms?: string | null;
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN = 42;
const INK = rgb(18 / 255, 38 / 255, 58 / 255);
const MUTED = rgb(102 / 255, 112 / 255, 133 / 255);
const BORDER = rgb(228 / 255, 231 / 255, 236 / 255);
const ACCENT = rgb(200 / 255, 85 / 255, 61 / 255);

function safeText(value: string | null | undefined) {
  return (value ?? "").replace(/[\u202f\u00a0]/g, " ").replace(/[\u2018\u2019]/g, "'").replace(/[\u201c\u201d]/g, '"').replace(/[\u2013\u2014]/g, "-").replace(/[^\x20-\x7E\xA0-\xFF]/g, "?");
}

function wrapText(text: string, font: PDFFont, size: number, maxWidth: number) {
  const words = safeText(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else { if (line) lines.push(line); line = word; }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
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
  if (data.dueDate) drawRight(page, `Echeance : ${date.format(data.dueDate)}`, PAGE_WIDTH - MARGIN, 738, regular, 9, MUTED);

  page.drawText("ADRESSE A", { x: MARGIN, y: 660, font: bold, size: 8, color: MUTED });
  page.drawText(safeText(data.contact.name), { x: MARGIN, y: 644, font: bold, size: 10, color: INK });
  if (data.contact.email) page.drawText(safeText(data.contact.email), { x: MARGIN, y: 630, font: regular, size: 9, color: MUTED });

  const columns = { description: MARGIN, quantity: 325, unit: 370, tax: 437, total: PAGE_WIDTH - MARGIN };
  let y = 590;
  page.drawRectangle({ x: MARGIN, y: y - 7, width: PAGE_WIDTH - MARGIN * 2, height: 24, color: INK });
  page.drawText("Description", { x: columns.description + 6, y, font: bold, size: 8, color: rgb(1, 1, 1) });
  drawRight(page, "Qte", columns.quantity + 22, y, bold, 8, rgb(1, 1, 1));
  drawRight(page, "P.U. HT", columns.unit + 50, y, bold, 8, rgb(1, 1, 1));
  drawRight(page, "TVA", columns.tax + 28, y, bold, 8, rgb(1, 1, 1));
  drawRight(page, "Total HT", columns.total - 6, y, bold, 8, rgb(1, 1, 1));
  y -= 30;

  for (const item of data.items) {
    const lines = wrapText(item.description, regular, 9, 285);
    const rowHeight = Math.max(24, lines.length * 11 + 10);
    if (y - rowHeight < 210) {
      page = document.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
      y = 780;
      page.drawText(`${safeText(title)} ${safeText(data.number)} - suite`, { x: MARGIN, y: 805, font: bold, size: 12, color: INK });
      page.drawRectangle({ x: MARGIN, y: y - 7, width: PAGE_WIDTH - MARGIN * 2, height: 24, color: INK });
      page.drawText("Description", { x: columns.description + 6, y, font: bold, size: 8, color: rgb(1, 1, 1) });
      drawRight(page, "Qte", columns.quantity + 22, y, bold, 8, rgb(1, 1, 1));
      drawRight(page, "P.U. HT", columns.unit + 50, y, bold, 8, rgb(1, 1, 1));
      drawRight(page, "TVA", columns.tax + 28, y, bold, 8, rgb(1, 1, 1));
      drawRight(page, "Total HT", columns.total - 6, y, bold, 8, rgb(1, 1, 1));
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

  let noteY = Math.min(totalY - 10, 165);
  for (const [label, content] of [["NOTES", data.notes], ["CONDITIONS", data.terms]] as const) {
    if (!content || noteY < 65) continue;
    page.drawText(label, { x: MARGIN, y: noteY, font: bold, size: 8, color: MUTED });
    noteY -= 14;
    for (const line of wrapText(content, regular, 8.5, 500).slice(0, 4)) { page.drawText(line, { x: MARGIN, y: noteY, font: regular, size: 8.5, color: INK }); noteY -= 11; }
    noteY -= 6;
  }

  const footer = safeText(`${data.org.name} - Document edite via Alymero.`);
  page.drawText(footer, { x: (PAGE_WIDTH - regular.widthOfTextAtSize(footer, 8)) / 2, y: 28, font: regular, size: 8, color: MUTED });
  return Buffer.from(await document.save({ useObjectStreams: false }));
}
