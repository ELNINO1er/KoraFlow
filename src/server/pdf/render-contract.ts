import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { sanitizeWinAnsi } from "@/lib/pdf/winansi";

export interface ContractPdfData {
  number: string;
  title: string;
  content: string;
  organization: { name: string; logoDataUri?: string | null };
  clientName: string;
  createdAt: Date;
  signedAt?: Date | null;
  signerName?: string | null;
  signerEmail?: string | null;
  contentHash?: string | null;
  locale: string;
}

const WIDTH = 595.28;
const HEIGHT = 841.89;
const MARGIN = 48;
const INK = rgb(18 / 255, 38 / 255, 58 / 255);
const MUTED = rgb(102 / 255, 112 / 255, 133 / 255);
const BORDER = rgb(228 / 255, 231 / 255, 236 / 255);
const SUCCESS = rgb(47 / 255, 133 / 255, 90 / 255);

// Conserve le fran\u00e7ais (accents, \u0153/\u0152, \u20ac\u2026) via WinAnsi ; seuls les caract\u00e8res
// non repr\u00e9sentables deviennent \u00ab ? \u00bb (\u00e9mission normalement bloqu\u00e9e en amont).
function safeText(value: string | null | undefined) {
  return sanitizeWinAnsi(value);
}

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

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const paragraphs = safeText(text).split(/\r?\n/);
  const lines: string[] = [];
  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const rawWord of paragraph.split(/\s+/)) {
      for (const word of breakLongWord(rawWord, font, size, maxWidth)) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
        else {
          if (line) lines.push(line);
          line = word;
        }
      }
    }
    if (line) lines.push(line);
  }
  return lines;
}

async function drawLogo(document: PDFDocument, page: PDFPage, dataUri?: string | null) {
  if (!dataUri) return false;
  const match = /^data:(image\/(?:png|jpeg));base64,([\s\S]+)$/.exec(dataUri);
  if (!match) return false;
  try {
    const bytes = Buffer.from(match[2]!, "base64");
    const image = match[1] === "image/png" ? await document.embedPng(bytes) : await document.embedJpg(bytes);
    const scaled = image.scaleToFit(42, 42);
    page.drawImage(image, { x: MARGIN, y: 757, width: scaled.width, height: scaled.height });
    return true;
  } catch {
    return false;
  }
}

export async function renderContractPdf(data: ContractPdfData): Promise<Buffer> {
  const document = await PDFDocument.create();
  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const date = new Intl.DateTimeFormat(data.locale, { dateStyle: "long", timeStyle: "short" });
  let page = document.addPage([WIDTH, HEIGHT]);
  let y = 785;

  document.setTitle(`${data.number} - ${data.title}`);
  document.setAuthor(data.organization.name);
  document.setCreator("Alymero");

  const hasLogo = await drawLogo(document, page, data.organization.logoDataUri);
  page.drawText(safeText(data.organization.name), { x: hasLogo ? 100 : MARGIN, y: 780, font: bold, size: 18, color: INK });
  page.drawText("CONTRAT", { x: 440, y: 780, font: bold, size: 16, color: INK });
  page.drawText(safeText(data.number), { x: 440, y: 763, font: regular, size: 9, color: MUTED });
  page.drawLine({ start: { x: MARGIN, y: 738 }, end: { x: WIDTH - MARGIN, y: 738 }, thickness: 1, color: BORDER });

  y = 704;
  page.drawText(safeText(data.title), { x: MARGIN, y, font: bold, size: 16, color: INK });
  y -= 22;
  page.drawText(`Client : ${safeText(data.clientName)}`, { x: MARGIN, y, font: regular, size: 9, color: MUTED });
  y -= 15;
  page.drawText(`Document cree le ${safeText(date.format(data.createdAt))}`, { x: MARGIN, y, font: regular, size: 9, color: MUTED });
  y -= 34;

  for (const line of wrap(data.content, regular, 10.5, WIDTH - MARGIN * 2)) {
    if (y < 82) {
      page = document.addPage([WIDTH, HEIGHT]);
      y = 785;
      page.drawText(`${safeText(data.number)} - suite`, { x: MARGIN, y: 810, font: bold, size: 9, color: MUTED });
    }
    if (line) page.drawText(line, { x: MARGIN, y, font: regular, size: 10.5, color: INK });
    y -= line ? 15 : 10;
  }

  if (data.signedAt) {
    if (y < 190) {
      page = document.addPage([WIDTH, HEIGHT]);
      y = 760;
    }
    y -= 20;
    page.drawRectangle({ x: MARGIN, y: y - 105, width: WIDTH - MARGIN * 2, height: 120, borderColor: SUCCESS, borderWidth: 1, color: rgb(247 / 255, 252 / 255, 249 / 255) });
    page.drawText("CERTIFICAT DE SIGNATURE ELECTRONIQUE SIMPLE", { x: MARGIN + 16, y: y - 10, font: bold, size: 10, color: SUCCESS });
    page.drawText(`Signe par : ${safeText(data.signerName)}`, { x: MARGIN + 16, y: y - 32, font: regular, size: 9, color: INK });
    page.drawText(`Lien transmis a : ${safeText(data.signerEmail)} (adresse non verifiee)`, { x: MARGIN + 16, y: y - 48, font: regular, size: 9, color: INK });
    page.drawText(`Date : ${safeText(date.format(data.signedAt))}`, { x: MARGIN + 16, y: y - 64, font: regular, size: 9, color: INK });
    const hash = safeText(data.contentHash);
    page.drawText("Empreinte SHA-256 :", { x: MARGIN + 16, y: y - 82, font: bold, size: 8, color: MUTED });
    page.drawText(hash, { x: MARGIN + 16, y: y - 96, font: regular, size: 7, color: INK });
  }

  for (const current of document.getPages()) {
    const footer = "Signature electronique simple - ce document ne constitue pas une signature qualifiee.";
    current.drawText(footer, { x: MARGIN, y: 28, font: regular, size: 7.5, color: MUTED });
  }

  return Buffer.from(await document.save({ useObjectStreams: false }));
}
