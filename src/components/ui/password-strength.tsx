"use client";

import { cn } from "@/lib/utils";

/**
 * Score de robustesse 0–4 (déterministe). N'empêche jamais la saisie ni les
 * gestionnaires de mots de passe : purement indicatif.
 */
export function passwordScore(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score += 1;
  if (pw.length >= 12) score += 1;
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) score += 1;
  if (/\d/.test(pw)) score += 1;
  if (/[^A-Za-z0-9]/.test(pw)) score += 1;
  return Math.min(score, 4);
}

const LABELS = ["Très faible", "Faible", "Moyen", "Bon", "Excellent"];
const BAR_TONE = ["bg-danger", "bg-danger", "bg-warning", "bg-success", "bg-success"];

export function PasswordStrength({ value, className }: { value: string; className?: string }) {
  const score = passwordScore(value);
  if (!value) return null;
  return (
    <div className={cn("flex flex-col gap-1", className)}>
      <div className="flex gap-1" aria-hidden>
        {[0, 1, 2, 3].map((i) => (
          <span
            key={i}
            className={cn(
              "h-1 flex-1 rounded-full transition-colors",
              i < score ? BAR_TONE[score] : "bg-border",
            )}
          />
        ))}
      </div>
      <p className="text-xs text-muted-foreground" aria-live="polite">
        Robustesse : {LABELS[score]}
      </p>
    </div>
  );
}
