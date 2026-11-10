"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarClock, Infinity as InfinityIcon, Loader2, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TrialChange } from "@/server/services/platform-admin";
import { updateOrgTrialAction } from "@/features/admin/actions";

/**
 * Contrôles de la période d'essai d'une organisation (console /admin) :
 * prolonger de N jours, fixer une date de fin, ou lever la limite.
 */
export function OrgTrialControl({ orgId, limited }: { orgId: string; limited: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [date, setDate] = useState("");

  function apply(change: TrialChange, success: string) {
    setError(null);
    setOk(null);
    startTransition(async () => {
      const r = await updateOrgTrialAction(orgId, change);
      if (!r.ok) {
        setError(r.error ?? "Modification impossible.");
        return;
      }
      setOk(success);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        {[7, 15, 30].map((days) => (
          <Button
            key={days}
            type="button"
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => apply({ mode: "extend", days }, `Essai prolongé de ${days} jours.`)}
          >
            <Plus className="size-4" /> {days} jours
          </Button>
        ))}
        {limited ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={() => {
              if (!window.confirm("Lever la limite d'essai ? L'organisation gardera un accès sans échéance.")) return;
              apply({ mode: "unlimited" }, "Limite d'essai levée.");
            }}
          >
            <InfinityIcon className="size-4" /> Sans limite
          </Button>
        ) : null}
        {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" /> : null}
      </div>
      <form
        className="flex flex-col gap-2 sm:flex-row sm:items-end"
        onSubmit={(e) => {
          e.preventDefault();
          if (date) apply({ mode: "until", date }, "Date de fin d'essai enregistrée.");
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={`trial-date-${orgId}`}>Nouvelle date de fin</Label>
          <Input id={`trial-date-${orgId}`} type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
        </div>
        <Button type="submit" variant="outline" size="sm" disabled={pending || !date}>
          <CalendarClock className="size-4" /> Fixer la date
        </Button>
      </form>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      {ok ? <p className="text-sm text-success">{ok}</p> : null}
    </div>
  );
}
