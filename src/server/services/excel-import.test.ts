import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import ExcelJS from "exceljs";
import { prisma } from "../database/client";
import type { AuthContext } from "../auth/context";
import { permissionsForRole } from "../permissions/permissions";
import { createOrganization } from "./organization-service";
import {
  prepareContactImport, commitContactImport, exportContactsWorkbook, buildContactTemplate,
} from "./contacts-excel";
import { prepareServiceImport, commitServiceImport } from "./services-excel";
import { parseWorkbook } from "@/lib/excel/workbook";
import { putPrivateFile, getPrivateFile } from "../storage/private-storage";
import { purgeExpiredImports } from "./import-purge";
import { newImportPreviewId, IMPORT_PREVIEW_TTL_MS } from "@/lib/excel/preview-id";

/** Tests d'intégration Import/Export Excel (base + stockage isolés). */

const SUFFIX = "excel-it";
let userId = "";
let orgId = "";
let ctx: AuthContext;
let uploadDir = "";

async function xlsx(sheetName: string, header: string[], rows: (string | number)[][], withFormula = false): Promise<Buffer> {
  const wb = new ExcelJS.Workbook();
  const ws = wb.addWorksheet(sheetName);
  ws.addRow(header);
  for (const r of rows) ws.addRow(r);
  if (withFormula) ws.getCell(`${String.fromCharCode(65 + header.length)}2`).value = { formula: "1+1", result: 2 };
  return Buffer.from((await wb.xlsx.writeBuffer()) as ArrayBuffer);
}

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), "koraflow-excel-"));
  process.env.STORAGE_DRIVER = "local";
  process.env.PRIVATE_UPLOAD_DIR = uploadDir;
  const user = await prisma.user.create({ data: { email: `owner-${SUFFIX}@test.local`, name: "Excel Owner", emailVerified: true } });
  userId = user.id;
  await createOrganization({ userId: user.id, name: `Excel ${SUFFIX}` });
  const org = await prisma.organization.findFirstOrThrow({ where: { memberships: { some: { userId: user.id } } } });
  orgId = org.id;
  ctx = {
    user: { id: user.id, email: user.email, name: user.name, image: null },
    organizationId: org.id,
    organization: { id: org.id, name: org.name, slug: org.slug, currency: org.currency, locale: org.locale, timezone: org.timezone },
    role: "OWNER", permissions: permissionsForRole("OWNER"), impersonatedBy: null,
  };
});

afterAll(async () => {
  await prisma.importBatch.deleteMany({ where: { organizationId: orgId } });
  await prisma.contact.deleteMany({ where: { organizationId: orgId } });
  await prisma.service.deleteMany({ where: { organizationId: orgId } });
  if (orgId) await prisma.organization.deleteMany({ where: { id: orgId } });
  if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
  if (uploadDir) await rm(uploadDir, { recursive: true, force: true });
});

describe("Import clients Excel", () => {
  it("reconnaît les en-têtes FR, conserve les zéros du téléphone, détecte doublons et e-mails invalides", async () => {
    const buf = await xlsx(
      "Clients",
      ["Prénom", "Nom", "E-mail", "Téléphone", "Référence"],
      [
        ["Awa", "Diop", "awa@baobab.ci", "0700000000", "CLI-1"],
        ["Awa", "Diop", "awa2@baobab.ci", "+225 07 00 00 00 01", "CLI-1"], // doublon de réf dans le fichier
        ["Koffi", "", "pas-un-email", "0102030405", "CLI-2"], // e-mail invalide
        ["Fatou", "Sow", "fatou@x.ci", "0200000000", "CLI-3"],
      ],
    );
    const prepared = await prepareContactImport(ctx, buf);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.preview.missingRequired).toHaveLength(0);
    expect(prepared.preview.summary.new).toBe(2); // CLI-1 (1ère) + CLI-3
    expect(prepared.preview.summary.duplicateInFile).toBe(1); // 2ème CLI-1
    expect(prepared.preview.summary.invalid).toBe(1); // e-mail invalide

    const res = await commitContactImport(ctx, { previewId: prepared.preview.previewId, idempotencyKey: "key-clients-1" });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.result.created).toBe(2);
    expect(res.result.rejected).toHaveLength(1);

    const awa = await prisma.contact.findFirstOrThrow({ where: { organizationId: orgId, externalRef: "CLI-1" } });
    expect(awa.phone).toBe("0700000000"); // zéro initial conservé (texte)
  });

  it("rejette un fichier contenant des formules", async () => {
    const buf = await xlsx("Clients", ["Prénom", "E-mail"], [["Awa", "awa@x.ci"]], true);
    const prepared = await prepareContactImport(ctx, buf);
    expect(prepared.ok).toBe(false);
    if (!prepared.ok) expect(prepared.error).toMatch(/formule/i);
  });

  it("est idempotent : rejouer la même clé ne recrée pas le lot", async () => {
    const buf = await xlsx("Clients", ["Prénom", "Référence"], [["Mariam", "CLI-REPLAY"]]);
    const p1 = await prepareContactImport(ctx, buf);
    expect(p1.ok && await commitContactImport(ctx, { previewId: p1.ok ? p1.preview.previewId : "", idempotencyKey: "key-replay" })).toBeTruthy();
    const p2 = await prepareContactImport(ctx, buf);
    const r2 = p2.ok ? await commitContactImport(ctx, { previewId: p2.preview.previewId, idempotencyKey: "key-replay" }) : null;
    expect(r2?.ok).toBe(true);
    if (r2?.ok) expect(r2.result.replayed).toBe(true);
    const count = await prisma.contact.count({ where: { organizationId: orgId, externalRef: "CLI-REPLAY" } });
    expect(count).toBe(1);
  });

  it("réimport : une référence déjà présente est classée « existante » (pas d'écrasement)", async () => {
    const buf = await xlsx("Clients", ["Prénom", "Référence"], [["Awa", "CLI-1"]]);
    const prepared = await prepareContactImport(ctx, buf);
    expect(prepared.ok && prepared.preview.summary.existing).toBe(1);
  });
});

describe("Export clients Excel", () => {
  it("exporte toutes les lignes (au-delà d'une page) avec téléphone en texte", async () => {
    // Crée 150 contacts (> MAX_PAGE_SIZE de 100).
    await prisma.contact.createMany({
      data: Array.from({ length: 150 }, (_, i) => ({
        organizationId: orgId, firstName: `Bulk${i}`, phone: "0700000000", portalToken: `tok-exp-${i}`,
      })),
    });
    const buf = await exportContactsWorkbook(ctx, {});
    const parsed = await parseWorkbook(buf, "Clients");
    // 150 bulk + ceux créés par les imports précédents.
    expect(parsed.rows.length).toBeGreaterThanOrEqual(150);
    expect(parsed.header).toContain("Téléphone");
    const phoneCol = parsed.header.indexOf("Téléphone");
    const aBulk = parsed.rows.find((r) => r.cells[0]?.startsWith("Bulk"));
    expect(aBulk?.cells[phoneCol]).toBe("0700000000");
  });
});

describe("Modèle d'import clients", () => {
  it("contient une feuille de données « Clients » (avec en-têtes) et une feuille « Instructions » non importable", async () => {
    const buf = await buildContactTemplate();
    const data = await parseWorkbook(buf, "Clients");
    expect(data.sheetNames).toContain("Clients");
    expect(data.sheetNames).toContain("Instructions");
    expect(data.header).toContain("Prénom");
    expect(data.header).toContain("Téléphone");
    expect(data.rows).toHaveLength(0); // aucune ligne d'exemple dans la feuille de données
  });
});

describe("Purge des imports abandonnés", () => {
  it("supprime les fichiers d'aperçu expirés, conserve les récents", async () => {
    const now = Date.now();
    const oldId = newImportPreviewId(now - IMPORT_PREVIEW_TTL_MS - 60_000);
    const freshId = newImportPreviewId(now);
    const oldKey = `imports/${orgId}/${userId}/${oldId}.xlsx`;
    const freshKey = `imports/${orgId}/${userId}/${freshId}.xlsx`;
    await putPrivateFile(oldKey, Buffer.from("vieux"));
    await putPrivateFile(freshKey, Buffer.from("recent"));

    const res = await purgeExpiredImports(now);
    expect(res.deleted).toBeGreaterThanOrEqual(1);

    await expect(getPrivateFile(oldKey)).rejects.toBeTruthy(); // supprimé
    await expect(getPrivateFile(freshKey)).resolves.toBeTruthy(); // conservé
  });
});

describe("Import services Excel", () => {
  it("parse le prix FR, respecte les décimales de la devise, borne la taxe, dédup par référence", async () => {
    // Devise de l'org = XOF (0 décimale) par défaut.
    const buf = await xlsx(
      "Services",
      ["Référence", "Nom", "Prix unitaire HT", "Taux de taxe (%)"],
      [
        ["SRV-1", "Développement", "1 500 000", "18"], // ok
        ["SRV-2", "Audit", "1 500,50", "18"], // décimale interdite en XOF → rejet
        ["SRV-3", "Design", "100000", "150"], // taxe hors bornes → rejet
        ["SRV-4", "Conseil", "50000", "0"], // ok
      ],
    );
    const prepared = await prepareServiceImport(ctx, buf);
    expect(prepared.ok).toBe(true);
    if (!prepared.ok) return;
    expect(prepared.preview.summary.new).toBe(2);
    expect(prepared.preview.summary.invalid).toBe(2);

    const res = await commitServiceImport(ctx, { previewId: prepared.preview.previewId, idempotencyKey: "key-svc-1" });
    expect(res.ok && res.result.created).toBe(2);
    const srv1 = await prisma.service.findFirstOrThrow({ where: { organizationId: orgId, reference: "SRV-1" } });
    expect(srv1.priceMinor).toBe(1_500_000); // XOF : 0 décimale → minor == major
    expect(srv1.taxRate).toBe(18);
  });
});
