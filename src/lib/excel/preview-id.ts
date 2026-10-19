import { randomBytes } from "node:crypto";

/**
 * Identifiant d'aperçu d'import = 12 hex d'horodatage (ms epoch) + 24 hex
 * aléatoires = 36 hex. L'horodatage permet un contrôle d'expiration côté serveur
 * et une purge des fichiers abandonnés sans table supplémentaire.
 */
export const IMPORT_PREVIEW_TTL_MS = 2 * 60 * 60 * 1000; // 2 heures

export function newImportPreviewId(nowMs: number): string {
  const ts = Math.floor(nowMs).toString(16).padStart(12, "0").slice(-12);
  return `${ts}${randomBytes(12).toString("hex")}`;
}

/** Epoch ms encodé dans un previewId, ou null si illisible. */
export function previewIdCreatedAt(previewId: string): number | null {
  if (!/^[a-f0-9]{36}$/.test(previewId)) return null;
  const ms = parseInt(previewId.slice(0, 12), 16);
  return Number.isFinite(ms) && ms > 0 ? ms : null;
}

export function isPreviewExpired(previewId: string, nowMs: number, ttlMs = IMPORT_PREVIEW_TTL_MS): boolean {
  const created = previewIdCreatedAt(previewId);
  if (created == null) return true; // illisible ⇒ considéré expiré (sécurité)
  return nowMs - created > ttlMs;
}
