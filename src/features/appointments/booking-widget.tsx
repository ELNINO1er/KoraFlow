"use client";

import { useState, useTransition } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import { minutesToLabel } from "@/lib/appointments/slots";
import { getSlotsAction, bookAction } from "@/features/appointments/public-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

interface DayOption {
  iso: string;
  label: string;
}

export function BookingWidget({ slug, days }: { slug: string; days: DayOption[] }) {
  const [date, setDate] = useState<string>("");
  const [slots, setSlots] = useState<number[]>([]);
  const [slot, setSlot] = useState<number | null>(null);
  const [loading, startLoading] = useTransition();
  const [submitting, startSubmit] = useTransition();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  function pickDate(iso: string) {
    setDate(iso);
    setSlot(null);
    setDone(null);
    startLoading(async () => {
      const s = await getSlotsAction(slug, iso);
      setSlots(s);
    });
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (slot === null) return;
    startSubmit(async () => {
      const result = await bookAction(slug, { dateISO: date, startMinutes: slot, name: name.trim(), email: email.trim(), phone: phone.trim() || undefined });
      if (!result.ok) {
        setError(result.error ?? "Réservation impossible.");
        return;
      }
      setDone(`${date} à ${minutesToLabel(slot)}`);
    });
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-6" />
        </span>
        <h2 className="font-display text-lg font-semibold text-foreground">Rendez-vous confirmé</h2>
        <p className="text-sm text-muted-foreground">Un e-mail de confirmation vous a été envoyé pour le {done} (UTC).</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <p className="mb-2 text-sm font-medium text-foreground">Choisissez une date</p>
        <div className="flex flex-wrap gap-2">
          {days.map((d) => (
            <button
              key={d.iso}
              type="button"
              onClick={() => pickDate(d.iso)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-xs font-medium capitalize",
                date === d.iso ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      {date ? (
        <div>
          <p className="mb-2 text-sm font-medium text-foreground">Créneaux disponibles (UTC)</p>
          {loading ? (
            <p className="text-sm text-muted-foreground"><Loader2 className="inline size-4 animate-spin" /> Chargement…</p>
          ) : slots.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun créneau disponible ce jour-là.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {slots.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSlot(s)}
                  className={cn(
                    "rounded-lg border px-3 py-1.5 text-sm font-medium",
                    slot === s ? "border-accent bg-accent text-accent-foreground" : "border-border text-foreground hover:bg-muted",
                  )}
                >
                  {minutesToLabel(s)}
                </button>
              ))}
            </div>
          )}
        </div>
      ) : null}

      {slot !== null ? (
        <form onSubmit={submit} className="flex flex-col gap-3 rounded-lg border border-border p-4">
          <p className="text-sm text-muted-foreground">
            Rendez-vous le <span className="font-medium text-foreground">{date} à {minutesToLabel(slot)}</span>
          </p>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bk-name">Votre nom *</Label>
            <Input id="bk-name" value={name} onChange={(e) => setName(e.target.value)} required minLength={2} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bk-email">E-mail *</Label>
            <Input id="bk-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="bk-phone">Téléphone</Label>
            <Input id="bk-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
          </div>
          {error ? <p className="text-sm text-danger">{error}</p> : null}
          <Button type="submit" disabled={submitting}>
            {submitting ? <Loader2 className="size-4 animate-spin" /> : null}
            Confirmer le rendez-vous
          </Button>
        </form>
      ) : null}
    </div>
  );
}
