"use client";

import { useEffect, useState } from "react";
import { authClient } from "@/server/auth/auth-client";
import { ACTIVITY_SYNC_MS, IDLE_TIMEOUT_MS, sessionActivityTime } from "@/lib/security/idle-session";

/** Shares genuine input across tabs; timers, polling and visibility do not count as activity. */
export function IdleSessionGuard() {
  const { data } = authClient.useSession();
  const [expired, setExpired] = useState(false);
  const sessionId = data?.session.id;
  const expiresAt = data?.session.expiresAt;

  useEffect(() => {
    if (!sessionId || !expiresAt) return;
    const key = `alymero:session-activity:${sessionId}`;
    let stopped = false;
    let expiring = false;
    let idleTimer: ReturnType<typeof setTimeout>;
    let syncTimer: ReturnType<typeof setTimeout> | undefined;
    let lastSent = 0;
    let inFlight = false;
    const read = () => {
      try { return Number(localStorage.getItem(key)) || 0; } catch { return 0; }
    };
    let lastActivity = sessionActivityTime(expiresAt, read(), Date.now());

    const expire = () => {
      if (expiring || stopped) return;
      expiring = true;
      setExpired(true);
      try { localStorage.setItem(`${key}:logout`, String(Date.now())); } catch { /* Storage may be disabled. */ }
      void authClient.signOut({ fetchOptions: { signal: AbortSignal.timeout(3000) } })
        .catch(() => undefined)
        .finally(() => { window.location.replace("/login?reason=inactivity"); });
    };

    const check = () => {
      lastActivity = Math.max(lastActivity, Math.min(Date.now(), read()));
      clearTimeout(idleTimer);
      const remaining = lastActivity + IDLE_TIMEOUT_MS - Date.now();
      if (remaining <= 0) { expire(); return false; }
      idleTimer = setTimeout(check, remaining);
      return true;
    };

    const sync = async () => {
      syncTimer = undefined;
      if (stopped || expiring || inFlight || !check()) return;
      inFlight = true;
      lastSent = Date.now();
      const sentActivity = lastActivity;
      try {
        const response = await fetch("/api/auth/session/activity", {
          method: "POST", credentials: "same-origin", cache: "no-store",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ idleForMs: Math.max(0, Date.now() - sentActivity) }),
          signal: AbortSignal.timeout(10_000),
        });
        if (response.status === 401 && !stopped) expire();
      } catch { /* A network error cannot extend the database session. */ }
      finally {
        inFlight = false;
        if (!stopped && !expiring && lastActivity > sentActivity) scheduleSync();
      }
    };
    const scheduleSync = () => {
      if (syncTimer || inFlight) return;
      syncTimer = setTimeout(() => { void sync(); }, Math.max(0, ACTIVITY_SYNC_MS - (Date.now() - lastSent)));
    };
    const activity = (event: Event) => {
      if (!event.isTrusted || expiring || !check()) return;
      const now = Date.now();
      if (now - lastActivity < 1000) return;
      lastActivity = now;
      try { localStorage.setItem(key, String(now)); } catch { /* Per-tab protection remains active. */ }
      check();
      scheduleSync();
    };
    const storage = (event: StorageEvent) => {
      if (event.key === `${key}:logout`) expire();
      else if (event.key === key) check();
    };
    const visibility = () => { if (document.visibilityState === "visible") check(); };
    const events = ["pointerdown", "pointermove", "keydown", "wheel", "touchstart"];
    events.forEach((name) => window.addEventListener(name, activity, { passive: true }));
    window.addEventListener("storage", storage);
    window.addEventListener("focus", check);
    document.addEventListener("visibilitychange", visibility);
    check();
    return () => {
      stopped = true;
      clearTimeout(idleTimer);
      clearTimeout(syncTimer);
      events.forEach((name) => window.removeEventListener(name, activity));
      window.removeEventListener("storage", storage);
      window.removeEventListener("focus", check);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [sessionId, expiresAt]);

  return expired ? <div role="alert" className="fixed inset-0 z-[100] flex items-center justify-center bg-background p-6 text-center">
    <p>Votre session a expiré après 5 minutes d’inactivité. Reconnexion en cours…</p>
  </div> : null;
}
