import * as React from "react";
import { cn } from "@/lib/utils";

/**
 * Sélecteur natif stylé de façon cohérente (pour les formulaires simples et les
 * server actions, où `name`/`value` natifs suffisent). Pour un sélecteur riche
 * (recherche, groupes), utiliser le composant Radix `Select`.
 */
export const NativeSelect = React.forwardRef<HTMLSelectElement, React.ComponentProps<"select">>(
  ({ className, ...props }, ref) => (
    <select
      ref={ref}
      className={cn(
        "h-10 rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-e1",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
      {...props}
    />
  ),
);
NativeSelect.displayName = "NativeSelect";
