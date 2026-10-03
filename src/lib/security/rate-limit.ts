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
const MAX_BUCKETS = 10_000;

function makeRoom(now: number): void {
  if (store.size < MAX_BUCKETS) return;

  for (const [key, bucket] of store) {
    if (bucket.resetAt <= now) store.delete(key);
  }

  while (store.size >= MAX_BUCKETS) {
    const oldestKey = store.keys().next().value as string | undefined;
    if (!oldestKey) break;
    store.delete(oldestKey);
  }
}

export interface RateLimitResult {
  ok: boolean;
  retryAfterMs?: number;
}

export function rateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const bucket = store.get(key);

  if (!bucket || bucket.resetAt <= now) {
    if (!bucket) makeRoom(now);
    store.set(key, { count: 1, resetAt: now + windowMs });
    return { ok: true };
  }
  if (bucket.count >= limit) {
    return { ok: false, retryAfterMs: bucket.resetAt - now };
  }
  bucket.count += 1;
  return { ok: true };
}
