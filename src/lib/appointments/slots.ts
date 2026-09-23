/**
 * Génération des créneaux disponibles — fonction PURE (testable).
 * Toutes les valeurs sont en minutes depuis minuit (heure locale de
 * l'organisation). Les créneaux sont contigus (pas de chevauchement avec un
 * rendez-vous déjà pris, buffer inclus) et respectent l'heure minimale de début.
 */
export interface TimeWindow {
  startMinutes: number;
  endMinutes: number;
}

export interface ComputeSlotsParams {
  windows: TimeWindow[];
  durationMinutes: number;
  bufferAfterMinutes?: number;
  booked?: TimeWindow[];
  /** Heure minimale de début autorisée (min. de préavis, ou « maintenant » si aujourd'hui). */
  minStartMinutes?: number;
}

export function computeSlots(params: ComputeSlotsParams): number[] {
  const { windows, durationMinutes } = params;
  const buffer = params.bufferAfterMinutes ?? 0;
  const minStart = params.minStartMinutes ?? 0;
  const blocked = (params.booked ?? []).map((b) => ({
    start: b.startMinutes,
    end: b.endMinutes + buffer,
  }));

  const slots: number[] = [];
  for (const w of windows) {
    for (let s = w.startMinutes; s + durationMinutes <= w.endMinutes; s += durationMinutes) {
      if (s < minStart) continue;
      const end = s + durationMinutes;
      const overlaps = blocked.some((b) => s < b.end && end > b.start);
      if (!overlaps) slots.push(s);
    }
  }
  return slots;
}

/** « 09:30 » à partir de minutes depuis minuit. */
export function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Convertit « 09:30 » en minutes depuis minuit (ou null si invalide). */
export function labelToMinutes(label: string): number | null {
  const m = /^(\d{1,2}):(\d{2})$/.exec(label.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (h > 23 || min > 59) return null;
  return h * 60 + min;
}
