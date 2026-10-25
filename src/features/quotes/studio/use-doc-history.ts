"use client";

import { useCallback, useRef, useState } from "react";

const COALESCE_MS = 900;
const MAX_HISTORY = 100;

/**
 * Historique annuler/rétablir d'un document. Les modifications successives d'un
 * même champ (même `group`) rapprochées dans le temps sont fusionnées en une
 * seule étape, pour qu'« Annuler » défasse un mot tapé et non une lettre.
 */
export function useDocHistory<T>(initial: T) {
  const [state, setState] = useState({ past: [] as T[], present: initial, future: [] as T[] });
  const last = useRef<{ group: string | null; at: number }>({ group: null, at: 0 });

  const update = useCallback((updater: (doc: T) => T, group: string | null = null) => {
    const now = Date.now();
    const coalesce = group !== null && last.current.group === group && now - last.current.at < COALESCE_MS;
    last.current = { group, at: now };
    setState((s) => {
      const next = updater(s.present);
      if (next === s.present) return s;
      return {
        past: coalesce ? s.past : [...s.past, s.present].slice(-MAX_HISTORY),
        present: next,
        future: [],
      };
    });
  }, []);

  const undo = useCallback(() => {
    last.current = { group: null, at: 0 };
    setState((s) => {
      const previous = s.past[s.past.length - 1];
      if (previous === undefined) return s;
      return { past: s.past.slice(0, -1), present: previous, future: [s.present, ...s.future] };
    });
  }, []);

  const redo = useCallback(() => {
    last.current = { group: null, at: 0 };
    setState((s) => {
      const next = s.future[0];
      if (next === undefined) return s;
      return { past: [...s.past, s.present], present: next, future: s.future.slice(1) };
    });
  }, []);

  return {
    doc: state.present,
    update,
    undo,
    redo,
    canUndo: state.past.length > 0,
    canRedo: state.future.length > 0,
  };
}
