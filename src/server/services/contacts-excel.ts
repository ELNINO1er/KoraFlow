import "server-only";
import { randomBytes } from "node:crypto";
import type { AuthContext } from "../auth/context";
import { assertCan } from "../permissions/permissions";
import { prisma } from "../database/client";
import { createContactSchema } from "@/lib/validation/contact";
import { parseWorkbook, buildWorkbook, INSTRUCTIONS_SHEET } from "@/lib/excel/workbook";
import { autoMapColumns, type FieldSpec } from "@/lib/excel/headers";
import { putPrivateFile, getPrivateFile, deletePrivateFile } from "../storage/private-storage";

/** Champs importables/exportables d'un client. Seul le prénom est obligatoire. */
export const CONTACT_FIELDS: FieldSpec[] = [
  { key: "firstName", label: "Prénom", required: true, aliases: ["prenom", "first name", "firstname"] },
  { key: "lastName", label: "Nom", required: false, aliases: ["nom", "last name", "lastname", "nom de famille"] },
  { key: "companyName", label: "Entreprise", required: false, aliases: ["societe", "company", "entreprise", "raison sociale"] },
  { key: "email", label: "E-mail", required: false, aliases: ["email", "e mail", "courriel", "mail", "adresse email"] },
  { key: "phone", label: "Téléphone", required: false, aliases: ["telephone", "phone", "tel", "mobile", "portable"] },
  { key: "source", label: "Source", required: false, aliases: ["origine", "source", "provenance"] },
  { key: "notes", label: "Notes", required: false, aliases: ["note", "notes", "remarques", "commentaire"] },
  { key: "externalRef", label: "Référence", required: false, aliases: ["reference", "ref", "ref externe", "reference externe", "identifiant", "id externe", "code client"] },
];

const MAX_ROWS = 5000;

export interface ContactRowPreview {
  excelRow: number;
  data: { firstName: string; lastName?: string; companyName?: string; email?: string; phone?: string; source?: string; notes?: string; externalRef?: string };
  status: "new" | "duplicate_in_file" | "existing" | "invalid";
  reasons: string[];
}

export interface ContactImportPreview {
  previewId: string;
  sheetNames: string[];
  sheetName: string;
  header: string[];
  mapping: Record<string, number>;
  missingRequired: string[];
  rows: ContactRowPreview[];
  summary: { total: number; new: number; existing: number; duplicateInFile: number; invalid: number };
}

function importKey(ctx: AuthContext, previewId: string) {
  return `imports/${ctx.organizationId}/${ctx.user.id}/${previewId}.xlsx`;
}

/** Normalise une cellule en valeur propre (ou undefined si vide). */
function clean(value: string | undefined): string | undefined {
  const v = (value ?? "").trim();
  return v === "" ? undefined : v;
}

function buildRow(cells: string[], mapping: Record<string, number>) {
  const get = (key: string) => (mapping[key] !== undefined ? clean(cells[mapping[key]!]) : undefined);
  return {
    firstName: get("firstName") ?? "",
    lastName: get("lastName"),
    companyName: get("companyName"),
    email: get("email"),
    phone: get("phone"),
    source: get("source"),
    notes: get("notes"),
    externalRef: get("externalRef"),
  };
}

/**
 * Prépare un import : conserve le fichier (lié à l'utilisateur+org), reconnaît
 * les colonnes, valide et classe chaque ligne. Aucune écriture métier ici.
 */
export async function prepareContactImport(
  ctx: AuthContext,
  buffer: Buffer,
  explicitMapping?: Record<string, number>,
  preferredSheet?: string,
): Promise<{ ok: true; preview: ContactImportPreview } | { ok: false; error: string }> {
  assertCan(ctx.role, "contacts.create");

  const parsed = await parseWorkbook(buffer, preferredSheet);
  if (parsed.hasFormulas) {
    return { ok: false, error: "Le fichier contient des formules : retirez-les avant l'import (les formules ne sont jamais évaluées)." };
  }
  if (parsed.rows.length === 0) return { ok: false, error: "Aucune donnée trouvée dans la feuille." };
  if (parsed.rows.length > MAX_ROWS) {
    return { ok: false, error: `Trop de lignes (${parsed.rows.length}). Maximum ${MAX_ROWS} par import.` };
  }

  const auto = autoMapColumns(parsed.header, CONTACT_FIELDS);
  const mapping = { ...auto.mapping, ...(explicitMapping ?? {}) };
  const missingRequired = CONTACT_FIELDS.filter((f) => f.required && mapping[f.key] === undefined).map((f) => f.label);

  // Références et e-mails existants dans l'organisation (pour les doublons).
  const existing = await prisma.contact.findMany({
    where: { organizationId: ctx.organizationId, deletedAt: null },
    select: { email: true, externalRef: true },
  });
  const existingRefs = new Set(existing.map((c) => c.externalRef).filter(Boolean) as string[]);
  const existingEmails = new Set(existing.map((c) => c.email?.toLowerCase()).filter(Boolean) as string[]);

  const seenRefs = new Set<string>();
  const seenEmails = new Set<string>();
  const rows: ContactRowPreview[] = [];

  for (const { excelRow, cells } of parsed.rows) {
    const data = buildRow(cells, mapping);
    const reasons: string[] = [];

    const validation = createContactSchema.safeParse({
      firstName: data.firstName,
      lastName: data.lastName,
      companyName: data.companyName,
      email: data.email,
      phone: data.phone,
      source: data.source,
      notes: data.notes,
    });
    let status: ContactRowPreview["status"] = "new";
    if (!validation.success) {
      status = "invalid";
      for (const issue of validation.error.issues) reasons.push(`${issue.path.join(".") || "ligne"} : ${issue.message}`);
    } else {
      const ref = data.externalRef;
      const emailLc = data.email?.toLowerCase();
      if (ref && (seenRefs.has(ref))) { status = "duplicate_in_file"; reasons.push(`Référence « ${ref} » en double dans le fichier`); }
      else if (emailLc && seenEmails.has(emailLc)) { status = "duplicate_in_file"; reasons.push(`E-mail « ${data.email} » en double dans le fichier`); }
      else if (ref && existingRefs.has(ref)) { status = "existing"; reasons.push(`Référence « ${ref} » déjà présente`); }
      else if (emailLc && existingEmails.has(emailLc)) { status = "existing"; reasons.push(`E-mail « ${data.email} » déjà présent`); }
      if (ref) seenRefs.add(ref);
      if (emailLc) seenEmails.add(emailLc);
    }
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

  return {
    ok: true,
    preview: {
      previewId,
      sheetNames: parsed.sheetNames,
      sheetName: parsed.sheetName,
      header: parsed.header,
      mapping,
      missingRequired,
      rows,
      summary,
    },
  };
}

export interface ContactImportResult {
  status: "COMPLETED" | "FAILED";
  created: number;
  skippedExisting: number;
  skippedDuplicateInFile: number;
  rejected: { excelRow: number; reasons: string[] }[];
  replayed: boolean;
}

/**
 * Confirme l'import : RELIT le fichier conservé et RE-VALIDE côté serveur (ne
 * fait jamais confiance à l'aperçu navigateur). Idempotent via la clé fournie :
 * une double confirmation renvoie le bilan du premier lot sans rejouer.
 * Par défaut : crée les nouveaux, ignore les doublons/existants. N'écrase rien.
 */
export async function commitContactImport(
  ctx: AuthContext,
  input: { previewId: string; idempotencyKey: string; mapping?: Record<string, number>; preferredSheet?: string },
): Promise<{ ok: true; result: ContactImportResult } | { ok: false; error: string }> {
  assertCan(ctx.role, "contacts.create");

  // Anti-rejeu : si un lot avec cette clé existe déjà, renvoyer son bilan.
  const already = await prisma.importBatch.findUnique({
    where: { organizationId_idempotencyKey: { organizationId: ctx.organizationId, idempotencyKey: input.idempotencyKey } },
  });
  if (already) {
    return { ok: true, result: { ...(already.summary as unknown as ContactImportResult), replayed: true } };
  }

  const key = importKey(ctx, input.previewId);
  let buffer: Buffer;
  try {
    buffer = await getPrivateFile(key);
  } catch {
    return { ok: false, error: "Fichier d'import introuvable ou expiré. Recommencez l'import." };
  }

  const prepared = await prepareContactImport(ctx, buffer, input.mapping, input.preferredSheet);
  if (!prepared.ok) return prepared;
  const { rows } = prepared.preview;

  const rejected = rows.filter((r) => r.status === "invalid").map((r) => ({ excelRow: r.excelRow, reasons: r.reasons }));
  const toCreate = rows.filter((r) => r.status === "new");
  const skippedExisting = rows.filter((r) => r.status === "existing").length;
  const skippedDuplicateInFile = rows.filter((r) => r.status === "duplicate_in_file").length;

  let created = 0;
  // Création par lots, dans une transaction (createMany ignore les doublons DB
  // via skipDuplicates sur la contrainte unique (org, externalRef)).
  await prisma.$transaction(async (tx) => {
    for (const r of toCreate) {
      await tx.contact.create({
        data: {
          organizationId: ctx.organizationId,
          firstName: r.data.firstName,
          lastName: r.data.lastName ?? null,
          companyName: r.data.companyName ?? null,
          email: r.data.email ?? null,
          phone: r.data.phone ?? null,
          source: r.data.source ?? null,
          notes: r.data.notes ?? null,
          externalRef: r.data.externalRef ?? null,
          portalToken: randomBytes(24).toString("hex"),
        },
      });
      created += 1;
    }
  });

  const result: ContactImportResult = {
    status: "COMPLETED",
    created,
    skippedExisting,
    skippedDuplicateInFile,
    rejected,
    replayed: false,
  };

  await prisma.importBatch.create({
    data: {
      organizationId: ctx.organizationId,
      userId: ctx.user.id,
      kind: "CONTACT",
      idempotencyKey: input.idempotencyKey,
      status: "COMPLETED",
      summary: {
        created,
        skippedExisting,
        skippedDuplicateInFile,
        rejected: rejected.length,
        total: rows.length,
      },
    },
  });
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      action: "contacts.imported",
      targetType: "Contact",
      metadata: { created, skippedExisting, skippedDuplicateInFile, rejected: rejected.length },
    },
  });

  // Nettoyage du fichier préparé (conservation limitée).
  await deletePrivateFile(key).catch(() => {});

  return { ok: true, result };
}

// --- Export + modèle ---------------------------------------------------------

async function allContacts(ctx: AuthContext, filters: { search?: string; stage?: string; type?: string }) {
  const where: Record<string, unknown> = { organizationId: ctx.organizationId, deletedAt: null };
  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: "insensitive" } },
      { lastName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
      { companyName: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.stage) where.stage = filters.stage;
  if (filters.type) where.type = filters.type;
  return prisma.contact.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      firstName: true, lastName: true, companyName: true, email: true,
      phone: true, source: true, notes: true, externalRef: true,
    },
  });
}

/** Génère le classeur d'export des clients autorisés (pas seulement la page). */
export async function exportContactsWorkbook(
  ctx: AuthContext,
  filters: { search?: string; stage?: string; type?: string },
): Promise<Buffer> {
  assertCan(ctx.role, "contacts.view");
  const contacts = await allContacts(ctx, filters);
  return buildWorkbook([
    {
      name: "Clients",
      columns: [
        { header: "Prénom", width: 18 },
        { header: "Nom", width: 18 },
        { header: "Entreprise", width: 24 },
        { header: "E-mail", width: 28 },
        { header: "Téléphone", width: 18, text: true },
        { header: "Source", width: 16 },
        { header: "Notes", width: 30 },
        { header: "Référence", width: 18, text: true },
      ],
      rows: contacts.map((c) => [
        c.firstName, c.lastName ?? "", c.companyName ?? "", c.email ?? "",
        c.phone ?? "", c.source ?? "", c.notes ?? "", c.externalRef ?? "",
      ]),
    },
  ]);
}

/** Modèle d'import clients : feuille de données vide + feuille d'instructions. */
export async function buildContactTemplate(): Promise<Buffer> {
  return buildWorkbook([
    {
      name: "Clients",
      columns: CONTACT_FIELDS.map((f) => ({
        header: f.label,
        width: 22,
        text: f.key === "phone" || f.key === "externalRef",
      })),
      rows: [],
    },
    {
      name: INSTRUCTIONS_SHEET,
      columns: [
        { header: "Colonne", width: 18 },
        { header: "Obligatoire", width: 14 },
        { header: "Format / exemple", width: 48 },
      ],
      rows: [
        ["Prénom", "Oui", "Texte. Ex. : Awa"],
        ["Nom", "Non", "Texte. Ex. : Diop"],
        ["Entreprise", "Non", "Texte. Ex. : Baobab SARL"],
        ["E-mail", "Non", "Adresse valide. Ex. : awa@baobab.ci"],
        ["Téléphone", "Non", "TEXTE (conserver les zéros et +). Ex. : +225 07 00 00 00 00"],
        ["Source", "Non", "Texte. Ex. : Salon, Recommandation"],
        ["Notes", "Non", "Texte libre"],
        ["Référence", "Non", "Identifiant stable pour le réimport (évite les doublons). Ex. : CLI-0001"],
        ["", "", ""],
        ["Les lignes de cette feuille « Instructions » ne sont PAS importées.", "", ""],
        ["Saisissez vos clients dans la feuille « Clients », sous la ligne d'en-tête.", "", ""],
      ],
    },
  ]);
}
