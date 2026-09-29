import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

// Ordre réel du flux : le compte d'abord, puis la confirmation d'e-mail (requise
// par Better Auth pour ouvrir une session), et enfin la création de l'entreprise
// (qui nécessite une session authentifiée). L'étiquetage suit donc la réalité.
const STEPS = ["Compte", "E-mail", "Entreprise"];

/** Progression d'inscription : Compte → E-mail → Entreprise (index 0-based). */
export function AuthStepper({ current }: { current: number }) {
  return (
    <ol className="mb-8 flex items-center" aria-label="Progression de l'inscription">
      {STEPS.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex flex-1 items-center last:flex-none">
            <div className="flex items-center gap-2">
              <span
                aria-current={active ? "step" : undefined}
                className={cn(
                  "flex size-6 shrink-0 items-center justify-center rounded-full border text-xs font-semibold transition-colors",
                  done
                    ? "border-accent bg-accent text-accent-foreground"
                    : active
                      ? "border-accent text-accent"
                      : "border-border text-muted-foreground",
                )}
              >
                {done ? <Check className="size-3.5" /> : i + 1}
              </span>
              <span
                className={cn(
                  "text-xs font-medium",
                  active || done ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </div>
            {i < STEPS.length - 1 ? (
              <span className={cn("mx-3 h-px flex-1", done ? "bg-accent" : "bg-border")} />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
