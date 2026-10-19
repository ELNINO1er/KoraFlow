import "server-only";
import { listPrivateFiles, deletePrivateFile } from "../storage/private-storage";
import { isPreviewExpired, IMPORT_PREVIEW_TTL_MS } from "@/lib/excel/preview-id";

/**
 * Purge les fichiers d'import Excel ABANDONNÉS (aperçus jamais confirmés) plus
 * vieux que le TTL. Ne touche PAS aux bilans d'audit (`ImportBatch`), conservés
 * séparément. Idempotent et sûr à relancer. Exécutable via scripts/purge-imports.ts
 * (cron sur Hostinger).
 */
export async function purgeExpiredImports(
  nowMs: number,
  ttlMs = IMPORT_PREVIEW_TTL_MS,
): Promise<{ scanned: number; deleted: number }> {
  const keys = await listPrivateFiles("imports");
  let deleted = 0;
  for (const key of keys) {
    const file = key.split("/").pop() ?? "";
    const previewId = file.replace(/\.xlsx$/i, "").replace(/^svc-/, "");
    if (isPreviewExpired(previewId, nowMs, ttlMs)) {
      await deletePrivateFile(key).catch(() => {});
      deleted += 1;
    }
  }
  return { scanned: keys.length, deleted };
}
