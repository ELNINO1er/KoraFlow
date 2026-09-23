/**
 * Limiteur de débit simple (fenêtre fixe, EN MÉMOIRE).
 *
 * ⚠️ Limite : le compteur est local au processus. Suffisant pour un déploiement
 * mono-instance (MVP). Pour plusieurs instances, brancher un store partagé
 * (Redis) derrière la même interface.
 */
interface Bucket {
  count: number;
  resetAt: number;
}

const store = new Map<string, Bucket>();

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs?: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { ok: true };
}
