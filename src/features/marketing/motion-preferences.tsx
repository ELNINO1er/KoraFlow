"use client";

import {
  createContext,
  useCallback,
  useContext,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { Sparkles, Zap } from "lucide-react";

/**
 * Gestion centralisée de `prefers-reduced-motion` + choix explicite de
 * l'utilisateur (persisté). On lit l'état via useSyncExternalStore (SSR-safe,
 * pas de setState dans un effet).
 *
 * Ordre de priorité : choix explicite (localStorage) > préférence système.
 */
const STORAGE_KEY = "kf-motion";
const EVENT = "kf-motion-change";

function subscribe(callback: () => void) {
  if (typeof window === "undefined") return () => {};
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  mq.addEventListener("change", callback);
  window.addEventListener(EVENT, callback);
  window.addEventListener("storage", callback);
  return () => {
    mq.removeEventListener("change", callback);
    window.removeEventListener(EVENT, callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): boolean {
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "reduced") return true;
  if (stored === "full") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/** Sur le serveur : mouvement complet par défaut (aucun flash). */
function getServerSnapshot(): boolean {
  return false;
}

interface MotionPref {
  reduced: boolean;
  toggle: () => void;
}

const MotionContext = createContext<MotionPref>({ reduced: false, toggle: () => {} });

export function MotionPreferencesProvider({ children }: { children: ReactNode }) {
  const reduced = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next = !getSnapshot();
    window.localStorage.setItem(STORAGE_KEY, next ? "reduced" : "full");
    window.dispatchEvent(new Event(EVENT));
  }, []);

  return <MotionContext.Provider value={{ reduced, toggle }}>{children}</MotionContext.Provider>;
}

export function useMotionPref() {
  return useContext(MotionContext);
}

/** Bouton flottant, discret, pour réduire/réactiver les animations. */
export function MotionToggleButton() {
  const { reduced, toggle } = useMotionPref();
  return (
    <button
      type="button"
      onClick={toggle}
      aria-pressed={reduced}
      className="fixed bottom-4 left-4 z-50 inline-flex h-11 items-center gap-2 rounded-full border border-border bg-surface/90 px-4 text-xs font-medium text-foreground shadow-lg backdrop-blur transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {reduced ? <Zap className="size-4 text-accent" /> : <Sparkles className="size-4 text-accent" />}
      {reduced ? "Activer les animations" : "Réduire les animations"}
    </button>
  );
}
