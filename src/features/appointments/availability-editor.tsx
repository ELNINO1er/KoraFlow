"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { labelToMinutes, minutesToLabel } from "@/lib/appointments/slots";
import { setAvailabilityAction } from "@/features/appointments/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface AvailabilityRow {
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
}

const DAYS = [
  { dow: 1, label: "Lundi" },
  { dow: 2, label: "Mardi" },
  { dow: 3, label: "Mercredi" },
  { dow: 4, label: "Jeudi" },
  { dow: 5, label: "Vendredi" },
  { dow: 6, label: "Samedi" },
  { dow: 0, label: "Dimanche" },
];

interface DayState {
  enabled: boolean;
  start: string;
  end: string;
}

export function AvailabilityEditor({
  typeId,
  availabilities,
  canEdit,
}: {
  typeId: string;
  availabilities: AvailabilityRow[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [days, setDays] = useState<Record<number, DayState>>(() => {
    const init: Record<number, DayState> = {};
    for (const d of DAYS) {
      const existing = availabilities.find((a) => a.dayOfWeek === d.dow);
      const weekday = d.dow >= 1 && d.dow <= 5;
      init[d.dow] = existing
        ? { enabled: true, start: minutesToLabel(existing.startMinutes), end: minutesToLabel(existing.endMinutes) }
        : { enabled: weekday && availabilities.length === 0, start: "09:00", end: "17:00" };
    }
    return init;
  });

  function update(dow: number, patch: Partial<DayState>) {
    setDays((prev) => ({ ...prev, [dow]: { ...prev[dow]!, ...patch } }));
    setSaved(false);
  }

  function save() {
    setError(null);
    const windows: AvailabilityRow[] = [];
    for (const d of DAYS) {
      const s = days[d.dow]!;
      if (!s.enabled) continue;
      const start = labelToMinutes(s.start);
      const end = labelToMinutes(s.end);
      if (start === null || end === null || end <= start) {
        setError(`Horaires invalides pour ${d.label}.`);
        return;
      }
      windows.push({ dayOfWeek: d.dow, startMinutes: start, endMinutes: end });
    }
    startTransition(async () => {
      const result = await setAvailabilityAction(typeId, windows);
      if (!result.ok) {
        setError(result.error ?? "Enregistrement impossible.");
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {DAYS.map((d) => {
        const s = days[d.dow]!;
        return (
          <div key={d.dow} className="flex flex-wrap items-center gap-3">
            <label className="flex w-32 items-center gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                checked={s.enabled}
                disabled={!canEdit}
                onChange={(e) => update(d.dow, { enabled: e.target.checked })}
                className="size-4 rounded border-input accent-[color:var(--color-primary)]"
              />
              {d.label}
            </label>
            <Input type="time" value={s.start} disabled={!canEdit || !s.enabled} onChange={(e) => update(d.dow, { start: e.target.value })} className="w-32" />
            <span className="text-muted-foreground">→</span>
            <Input type="time" value={s.end} disabled={!canEdit || !s.enabled} onChange={(e) => update(d.dow, { end: e.target.value })} className="w-32" />
          </div>
        );
      })}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      {canEdit ? (
        <div>
          <Button type="button" onClick={save} disabled={pending}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : saved ? <Check className="size-4" /> : null}
            {saved ? "Enregistré" : "Enregistrer les disponibilités"}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
