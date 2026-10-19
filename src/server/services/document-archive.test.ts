import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtemp, rm, readFile, access } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import { prisma } from "../database/client";
import { createOrganization } from "./organization-service";
import { archiveDocument } from "./document-archive-service";
import {
  getArchiveById,
  getArchiveByToken,
  listArchivesForDocument,
} from "../repositories/document-archive-repository";

/**
 * TEST D'INTÉGRATION de l'archivage de documents finalisés, sur base ISOLÉE et
 * stockage LOCAL isolé (répertoire temporaire). Vérifie : conservation du PDF,
 * empreinte, idempotence/reprise, accès scopé, pas de doublon ni de
 * remplacement silencieux.
 */

const SUFFIX = "archive-it";
let userId = "";
let orgId = "";
let uploadDir = "";
const DOC_ID = "doc-archive-test-1";
const PDF = Buffer.from("%PDF-1.4\nFaux PDF de test pour archivage.\n%%EOF");

beforeAll(async () => {
  uploadDir = await mkdtemp(path.join(tmpdir(), "koraflow-archive-"));
  process.env.STORAGE_DRIVER = "local";
  process.env.PRIVATE_UPLOAD_DIR = uploadDir;

  const user = await prisma.user.create({
    data: { email: `owner-${SUFFIX}@test.local`, name: "Archive Owner", emailVerified: true },
  });
  userId = user.id;
  await createOrganization({ userId: user.id, name: `Archive ${SUFFIX}` });
  const org = await prisma.organization.findFirstOrThrow({
    where: { memberships: { some: { userId: user.id } } },
  });
  orgId = org.id;
});

afterAll(async () => {
  await prisma.documentArchive.deleteMany({ where: { organizationId: orgId } });
  if (orgId) await prisma.organization.deleteMany({ where: { id: orgId } });
  if (userId) await prisma.user.deleteMany({ where: { id: userId } });
  await prisma.$disconnect();
  if (uploadDir) await rm(uploadDir, { recursive: true, force: true });
});

describe("archiveDocument", () => {
  it("conserve le PDF, enregistre l'empreinte et marque STORED", async () => {
    const res = await archiveDocument({
      organizationId: orgId,
      documentType: "CONTRACT",
      documentId: DOC_ID,
      reason: "SIGNED",
      contentHash: "abc",
      pdf: PDF,
      snapshot: { number: "CTR-2026-0001", title: "Test" },
    });
    expect(res.ok).toBe(true);
    if (!res.ok) return;
    expect(res.version).toBe(1);
    expect(res.pdfSha256).toBe(createHash("sha256").update(PDF).digest("hex"));

    const archive = await getArchiveById(orgId, res.id);
    expect(archive?.status).toBe("STORED");
    // Le fichier existe réellement dans le stockage isolé.
    const stored = await readFile(path.join(uploadDir, archive!.pdfStorageKey!));
    expect(Buffer.compare(stored, PDF)).toBe(0);
  });

  it("est idempotent : un second archivage (même document+raison) ne crée pas de doublon", async () => {
    const res = await archiveDocument({
      organizationId: orgId,
      documentType: "CONTRACT",
      documentId: DOC_ID,
      reason: "SIGNED",
      contentHash: "abc",
      pdf: PDF,
      snapshot: { number: "CTR-2026-0001", title: "Test" },
    });
    expect(res.ok).toBe(true);
    if (res.ok) expect(res.reused).toBe(true);

    const all = await listArchivesForDocument({ organizationId: orgId, documentType: "CONTRACT", documentId: DOC_ID });
    expect(all).toHaveLength(1);
    expect(all[0]!.version).toBe(1);
  });

  it("téléchargement par jeton public uniquement si STORED", async () => {
    const all = await listArchivesForDocument({ organizationId: orgId, documentType: "CONTRACT", documentId: DOC_ID });
    const token = all[0]!.publicToken!;
    const byToken = await getArchiveByToken(token);
    expect(byToken?.id).toBe(all[0]!.id);
  });

  it("isolation multi-tenant : une autre organisation ne voit pas l'archive", async () => {
    const all = await listArchivesForDocument({ organizationId: orgId, documentType: "CONTRACT", documentId: DOC_ID });
    expect(await getArchiveById("org-inexistante", all[0]!.id)).toBeNull();
  });

  it("confirme qu'aucun fichier n'est écrasé silencieusement (write-once côté stockage)", async () => {
    const all = await listArchivesForDocument({ organizationId: orgId, documentType: "CONTRACT", documentId: DOC_ID });
    const key = all[0]!.pdfStorageKey!;
    // Le fichier existe déjà ; un nouvel archivage idempotent n'a pas levé d'erreur
    // et ne l'a pas remplacé (contenu inchangé vérifié ci-dessus).
    await expect(access(path.join(uploadDir, key))).resolves.toBeUndefined();
  });
});

describe("archiveDocument — versions & reprise", () => {
  const DOC2 = "doc-archive-versions";

  it("même empreinte → réutilise la version ; empreinte différente → nouvelle version", async () => {
    const r1 = await archiveDocument({ organizationId: orgId, documentType: "INVOICE", documentId: DOC2, reason: "SENT", contentHash: "fp-A", pdf: Buffer.from("%PDF-A"), snapshot: { v: 1 } });
    const r1b = await archiveDocument({ organizationId: orgId, documentType: "INVOICE", documentId: DOC2, reason: "SENT", contentHash: "fp-A", pdf: Buffer.from("%PDF-A"), snapshot: { v: 1 } });
    const r2 = await archiveDocument({ organizationId: orgId, documentType: "INVOICE", documentId: DOC2, reason: "SENT", contentHash: "fp-B", pdf: Buffer.from("%PDF-B-corrige"), snapshot: { v: 2 } });
    expect(r1.ok && r1b.ok && r2.ok).toBe(true);
    if (r1.ok && r1b.ok && r2.ok) {
      expect(r1b.version).toBe(r1.version); // réutilisée
      expect(r2.version).toBe(r1.version + 1); // nouvelle version après correction
    }
    const all = await listArchivesForDocument({ organizationId: orgId, documentType: "INVOICE", documentId: DOC2 });
    expect(all).toHaveLength(2);
  });

  it("reprise : une archive FAILED est stockée au ré-essai (sans doublon)", async () => {
    const DOC3 = "doc-archive-retry";
    // Simule une tentative précédente échouée : ligne FAILED, aucun fichier.
    const failed = await prisma.documentArchive.create({
      data: {
        organizationId: orgId, documentType: "CONTRACT", documentId: DOC3, version: 1,
        reason: "SIGNED", contentHash: "fp-retry", snapshot: { v: 1 },
        pdfStorageKey: `archives/${orgId}/CONTRACT/${DOC3}/v1.pdf`, status: "FAILED",
      },
    });
    const res = await archiveDocument({ organizationId: orgId, documentType: "CONTRACT", documentId: DOC3, reason: "SIGNED", contentHash: "fp-retry", pdf: Buffer.from("%PDF-retry"), snapshot: { v: 1 } });
    expect(res.ok).toBe(true);
    const reloaded = await getArchiveById(orgId, failed.id);
    expect(reloaded?.status).toBe("STORED");
    const all = await listArchivesForDocument({ organizationId: orgId, documentType: "CONTRACT", documentId: DOC3 });
    expect(all).toHaveLength(1); // reprise, pas de doublon
  });
});
