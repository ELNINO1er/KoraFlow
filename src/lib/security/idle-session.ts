export const IDLE_TIMEOUT_SECONDS = 5 * 60;
export const IDLE_TIMEOUT_MS = IDLE_TIMEOUT_SECONDS * 1000;
export const ACTIVITY_SYNC_MS = 15_000;

/** Activity never revives an already expired session. Background reads never touch it. */
export function activityExpiry(now: number, idleForMs: number) {
  return new Date(now + IDLE_TIMEOUT_MS - Math.min(IDLE_TIMEOUT_MS, Math.max(0, idleForMs)));
}

export function sessionActivityTime(expiresAt: string | Date, stored: number, now: number) {
  const baseline = new Date(expiresAt).getTime() - IDLE_TIMEOUT_MS;
  return Math.min(now, Math.max(baseline, Number.isFinite(stored) ? stored : 0));
}
