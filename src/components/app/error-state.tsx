import type { ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** État d'erreur réutilisable (bord d'erreur / accès refusé…). */
export function ErrorState({
  title = "Une erreur est survenue",
  description = "Une erreur inattendue s'est produite. Vous pouvez réessayer.",
  retryLabel = "Réessayer",
  onRetry,
  className,
}: {
  title?: ReactNode;
  description?: ReactNode;
  retryLabel?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-border bg-surface px-6 py-12 text-center",
        className,
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-danger/15 text-danger">
        <AlertTriangle className="size-6" />
      </span>
      <div>
        <p className="font-display text-base font-semibold text-foreground">{title}</p>
        <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>
      </div>
      {onRetry ? (
        <Button type="button" variant="outline" onClick={onRetry} className="mt-1">
          {retryLabel}
        </Button>
      ) : null}
    </div>
  );
}
