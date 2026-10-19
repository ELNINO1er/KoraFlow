import "server-only";
import { randomBytes } from "node:crypto";
import type { AuthContext } from "../auth/context";
import { assertCan } from "../permissions/permissions";
import { prisma } from "../database/client";
import { parseWorkbook, buildWorkbook, INSTRUCTIONS_SHEET } from "@/lib/excel/workbook";
import { autoMapColumns, type FieldSpec } from "@/lib/excel/headers";
import { parseFrenchDecimal } from "@/lib/excel/number-fr";
import { minorUnitsFor } from "@/lib/formatting/currency";
import { MAX_MONEY_MINOR } from "@/lib/quotes/totals";
import { putPrivateFile, getPrivateFile, deletePrivateFile } from "../storage/private-storage";
import { SERVICE_UNITS } from "@/lib/validation/service";

export const SERVICE_FIELDS: FieldSpec[] = [
  { key: "reference", label: "Référence", required: false, aliases: ["reference", "ref", "code", "code service", "code article"] },
  { key: "name", label: "Nom", required: true, aliases: ["nom", "intitule", "libelle", "designation", "name"] },
  { key: "description", label: "Description", required: false, aliases: ["description", "detail", "details"] },
  { key: "category", label: "Catégorie", required: false, aliases: ["categorie", "famille", "category"] },
  { key: "unit", label: "Unité", required: false, aliases: ["unite", "unit"] },
  { key: "priceMajor", label: "Prix unitaire HT", required: false, aliases: ["prix", "prix ht", "prix unitaire", "prix unitaire ht", "montant", "tarif"] },
  { key: "taxRate", label: "Taux de taxe (%)", required: false, aliases: ["tva", "taxe", "taux de taxe", "taux tva", "taux", "tva %"] },
  { key: "estimatedDurationMinutes", label: "Durée (min)", required: false, aliases: ["duree", "duree min", "duree minutes", "duree estimee"] },
  { key: "active", label: "Actif", required: false, aliases: ["actif", "active", "statut", "etat"] },
];

const MAX_ROWS = 5000;

export interface ServiceRowPreview {
  excelRow: number;
  data: { reference?: string; name: string; description?: string; category?: string; unit: string; priceMinor: number; taxRate: number; estimatedDurationMinutes?: number; active: boolean };
  status: "new" | "duplicate_in_file" | "existing" | "invalid";
  reasons: string[];
}

export interface ServiceImportPreview {
  previewId: string;
  sheetNames: string[];
  sheetName: string;
  header: string[];
  mapping: Record<string, number>;
  missingRequired: string[];
  currency: string;
  rows: ServiceRowPreview[];
  summary: { total: number; new: number; existing: number; duplicateInFile: number; invalid: number };
}

function importKey(ctx: AuthContext, previewId: string) {
  return `imports/${ctx.organizationId}/${ctx.user.id}/svc-${previewId}.xlsx`;
}

function clean(value: string | undefined): string | undefined {
  const v = (value ?? "").trim();
  return v === "" ? undefined : v;
}

function parseActive(raw: string | undefined): boolean {
  const v = (raw ?? "").trim().toLowerCase();
  if (v === "") return true;
  return !["non", "no", "false", "faux", "0", "inactif", "archive", "archivé", "archivée"].includes(v);
}

export async function prepareServiceImport(
  ctx: AuthContext,
  buffer: Buffer,
  explicitMapping?: Record<string, number>,
  preferredSheet?: string,
): Promise<{ ok: true; preview: ServiceImportPreview } | { ok: false; error: string }> {
  assertCan(ctx.role, "services.create");

  const currency = ctx.organization.currency;
  const minor = minorUnitsFor(currency);

  const parsed = await parseWorkbook(buffer, preferredSheet);
  if (parsed.hasFormulas) {
    return { ok: false, error: "Le fichier contient des formules : retirez-les avant l'import (jamais évaluées)." };
  }
  if (parsed.rows.length === 0) return { ok: false, error: "Aucune donnée trouvée dans la feuille." };
  if (parsed.rows.length > MAX_ROWS) return { ok: false, error: `Trop de lignes (${parsed.rows.length}). Maximum ${MAX_ROWS}.` };

  const auto = autoMapColumns(parsed.header, SERVICE_FIELDS);
  const mapping = { ...auto.mapping, ...(explicitMapping ?? {}) };
  const missingRequired = SERVICE_FIELDS.filter((f) => f.required && mapping[f.key] === undefined).map((f) => f.label);

  const existing = await prisma.service.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    select: { reference: true },
  });
  const existingRefs = new Set(existing.map((s) => s.reference).filter(Boolean) as string[]);
  const seenRefs = new Set<string>();

  const rows: ServiceRowPreview[] = [];
  for (const { excelRow, cells } of parsed.rows) {
    const get = (key: string) => (mapping[key] !== undefined ? clean(cells[mapping[key]!]) : undefined);
    const reasons: string[] = [];
    const name = get("name") ?? "";
    const reference = get("reference");

    // Prix (unité majeure → minor), format FR, décimales de la devise.
    let priceMinor = 0;
    const rawPrice = get("priceMajor");
    if (rawPrice) {
      const p = parseFrenchDecimal(rawPrice, minor);
      if (!p.ok) reasons.push(`Prix : ${p.error}`);
      else {
        priceMinor = Math.round(p.value * 10 ** minor);
        if (priceMinor < 0) reasons.push("Prix négatif non autorisé");
        else if (priceMinor > MAX_MONEY_MINOR) reasons.push("Prix trop élevé");
      }
    }

    // Taux de taxe.
    let taxRate = 0;
    const rawTax = get("taxRate");
    if (rawTax) {
      const t = parseFrenchDecimal(rawTax.replace(/%/g, ""), 0);
      if (!t.ok) reasons.push(`Taxe : ${t.error}`);
      else if (t.value < 0 || t.value > 100) reasons.push("Taux de taxe hors bornes (0–100)");
      else taxRate = Math.round(t.value);
    }

    // Durée estimée.
    let estimatedDurationMinutes: number | undefined;
    const rawDur = get("estimatedDurationMinutes");
    if (rawDur) {
      const d = parseFrenchDecimal(rawDur, 0);
      if (!d.ok) reasons.push(`Durée : ${d.error}`);
      else if (d.value < 0 || d.value > 100_000) reasons.push("Durée hors bornes");
      else estimatedDurationMinutes = Math.round(d.value);
    }

    const unitRaw = get("unit");
    const unit = unitRaw && SERVICE_UNITS.includes(unitRaw as (typeof SERVICE_UNITS)[number]) ? unitRaw : (unitRaw ?? "forfait");

    if (name.trim().length < 1) reasons.push("Nom requis");
    if (name.length > 150) reasons.push("Nom trop long (max 150)");

    const data = {
      reference, name, description: get("description"), category: get("category"),
      unit, priceMinor, taxRate, estimatedDurationMinutes, active: parseActive(get("active")),
    };

    let status: ServiceRowPreview["status"] = "new";
    if (reasons.length) status = "invalid";
    else if (reference && seenRefs.has(reference)) { status = "duplicate_in_file"; reasons.push(`Référence « ${reference} » en double dans le fichier`); }
    else if (reference && existingRefs.has(reference)) { status = "existing"; reasons.push(`Référence « ${reference} » déjà présente`); }
    if (reference) seenRefs.add(reference);

    rows.push({ excelRow, data, status, reasons });
  }

  const summary = {
    total: rows.length,
    new: rows.filter((r) => r.status === "new").length,
    existing: rows.filter((r) => r.status === "existing").length,
    duplicateInFile: rows.filter((r) => r.status === "duplicate_in_file").length,
    invalid: rows.filter((r) => r.status === "invalid").length,
  };

  const previewId = randomBytes(18).toString("hex");
  await putPrivateFile(importKey(ctx, previewId), buffer);
  return { ok: true, preview: { previewId, sheetNames: parsed.sheetNames, sheetName: parsed.sheetName, header: parsed.header, mapping, missingRequired, currency, rows, summary } };
}

export interface ServiceImportResult {
  status: "COMPLETED" | "FAILED";
  created: number;
  skippedExisting: number;
  skippedDuplicateInFile: number;
  rejected: { excelRow: number; reasons: string[] }[];
  replayed: boolean;
}

export async function commitServiceImport(
  ctx: AuthContext,
  input: { previewId: string; idempotencyKey: string; mapping?: Record<string, number>; preferredSheet?: string },
): Promise<{ ok: true; result: ServiceImportResult } | { ok: false; error: string }> {
  assertCan(ctx.role, "services.create");

  const already = await prisma.importBatch.findUnique({
    where: { organizationId_idempotencyKey: { organizationId: ctx.organizationId, idempotencyKey: input.idempotencyKey } },
  });
  if (already) return { ok: true, result: { ...(already.summary as unknown as ServiceImportResult), replayed: true } };

  const key = importKey(ctx, input.previewId);
  let buffer: Buffer;
  try { buffer = await getPrivateFile(key); }
  catch { return { ok: false, error: "Fichier d'import introuvable ou expiré. Recommencez l'import." }; }

  const prepared = await prepareServiceImport(ctx, buffer, input.mapping, input.preferredSheet);
  if (!prepared.ok) return prepared;
  const { rows } = prepared.preview;

  const rejected = rows.filter((r) => r.status === "invalid").map((r) => ({ excelRow: r.excelRow, reasons: r.reasons }));
  const toCreate = rows.filter((r) => r.status === "new");
  const skippedExisting = rows.filter((r) => r.status === "existing").length;
  const skippedDuplicateInFile = rows.filter((r) => r.status === "duplicate_in_file").length;

  let created = 0;
  await prisma.$transaction(async (tx) => {
    for (const r of toCreate) {
      await tx.service.create({
        data: {
          organizationId: ctx.organizationId,
          reference: r.data.reference ?? null,
          name: r.data.name,
          description: r.data.description ?? null,
          category: r.data.category ?? null,
          unit: r.data.unit,
          priceMinor: r.data.priceMinor,
          taxRate: r.data.taxRate,
          estimatedDurationMinutes: r.data.estimatedDurationMinutes ?? null,
          active: r.data.active,
        },
      });
      created += 1;
    }
  });

  const result: ServiceImportResult = { status: "COMPLETED", created, skippedExisting, skippedDuplicateInFile, rejected, replayed: false };
  await prisma.importBatch.create({
    data: {
      organizationId: ctx.organizationId, userId: ctx.user.id, kind: "SERVICE",
      idempotencyKey: input.idempotencyKey, status: "COMPLETED",
      summary: { created, skippedExisting, skippedDuplicateInFile, rejected: rejected.length, total: rows.length },
    },
  });
  await prisma.auditLog.create({
    data: { organizationId: ctx.organizationId, actorUserId: ctx.user.id, action: "services.imported", targetType: "Service", metadata: { created, skippedExisting, skippedDuplicateInFile, rejected: rejected.length } },
  });
  await deletePrivateFile(key).catch(() => {});
  return { ok: true, result };
}

// --- Export + modèle ---------------------------------------------------------

export async function exportServicesWorkbook(
  ctx: AuthContext,
  filters: { search?: string; activeOnly?: boolean },
): Promise<Buffer> {
  assertCan(ctx.role, "services.view");
  const minor = minorUnitsFor(ctx.organization.currency);
  const where: Record<string, unknown> = { organizationId: ctx.organizationId, deletedAt: null };
  if (filters.activeOnly) where.active = true;
  if (filters.search) where.OR = [
    { name: { contains: filters.search, mode: "insensitive" } },
    { category: { contains: filters.search, mode: "insensitive" } },
  ];
  const services = await prisma.service.findMany({
    where, orderBy: { createdAt: "desc" },
    select: { reference: true, name: true, description: true, category: true, unit: true, priceMinor: true, taxRate: true, estimatedDurationMinutes: true, active: true },
  });
  return buildWorkbook([
    {
      name: "Services",
      columns: [
        { header: "Référence", width: 16, text: true },
        { header: "Nom", width: 26 },
        { header: "Description", width: 34 },
        { header: "Catégorie", width: 18 },
        { header: "Unité", width: 12 },
        { header: `Prix unitaire HT (${ctx.organization.currency})`, width: 20 },
        { header: "Taux de taxe (%)", width: 16 },
        { header: "Durée (min)", width: 14 },
        { header: "Actif", width: 10 },
      ],
      rows: services.map((s) => [
        s.reference ?? "", s.name, s.description ?? "", s.category ?? "", s.unit,
        s.priceMinor / 10 ** minor, s.taxRate, s.estimatedDurationMinutes ?? "", s.active ? "Oui" : "Non",
      ]),
    },
  ]);
}

export async function buildServiceTemplate(currency: string): Promise<Buffer> {
  return buildWorkbook([
    {
      name: "Services",
      columns: SERVICE_FIELDS.map((f) => ({ header: f.label, width: 20, text: f.key === "reference" })),
      rows: [],
    },
    {
      name: INSTRUCTIONS_SHEET,
      columns: [
        { header: "Colonne", width: 20 },
        { header: "Obligatoire", width: 14 },
        { header: "Format / exemple", width: 52 },
      ],
      rows: [
        ["Référence", "Non", "Identifiant stable pour le réimport (évite les doublons). Ex. : SRV-001"],
        ["Nom", "Oui", "Texte. Ex. : Développement site web"],
        ["Description", "Non", "Texte libre"],
        ["Catégorie", "Non", "Texte. Ex. : Web"],
        ["Unité", "Non", `Une parmi : ${SERVICE_UNITS.join(", ")} (défaut : forfait)`],
        ["Prix unitaire HT", "Non", `En ${currency}, hors taxe. Virgule décimale acceptée. Ex. : 150000 ou 1 500,50`],
        ["Taux de taxe (%)", "Non", "Entier 0 à 100. Ex. : 18"],
        ["Durée (min)", "Non", "Entier de minutes. Ex. : 120"],
        ["Actif", "Non", "Oui/Non (défaut : Oui)"],
        ["", "", ""],
        [`Devise de l'organisation : ${currency}. Aucune conversion automatique n'est faite.`, "", ""],
        ["Les lignes de cette feuille « Instructions » ne sont PAS importées.", "", ""],
      ],
    },
  ]);
}
