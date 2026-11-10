import { Clock } from "lucide-react";
import type { TrialState } from "@/lib/billing/trial";
import { DateText } from "@/components/ui/date-text";
import { cn } from "@/lib/utils";

/**
 * Bandeau de l'espace de travail pendant l'essai gratuit : jours restants et
 * date de fin. Après l'échéance, l'espace redirige vers /essai-termine (le
 * bandeau n'est donc affiché que pendant l'essai).
 */
export function TrialBanner({ trial, localeTag }: { trial: TrialState | undefined; localeTag: string }) {
  if (!trial || trial.kind !== "active") return null;
  const urgent = trial.daysLeft <= 3;
  return (
    <div
      role="status"
      className={cn(
        "flex items-start justify-center gap-2 px-4 py-2 text-sm sm:items-center",
        urgent ? "bg-warning text-warning-foreground" : "bg-primary/10 text-foreground",
      )}
    >
      <Clock className="mt-0.5 size-4 shrink-0 sm:mt-0" aria-hidden />
      <span>
        <strong className="font-semibold">
          Essai gratuit : {trial.daysLeft} jour{trial.daysLeft > 1 ? "s" : ""} restant{trial.daysLeft > 1 ? "s" : ""}
        </strong>{" "}
        — se termine le <DateText value={trial.endsAt} variant="datetime" locale={localeTag} />. Vos données restent
        conservées après l&apos;essai.
      </span>
    </div>
  );
}
