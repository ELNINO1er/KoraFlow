import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/**
 * Bandeau d'indicateurs : une seule carte blanche, les indicateurs côte à côte
 * séparés par des filets verticaux (empilés sur mobile).
 */
export function StatBand({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <Card
      className={cn(
        "grid gap-y-6 p-6 sm:grid-cols-2 xl:grid-cols-4 [&>*]:xl:border-l [&>*]:xl:border-border [&>*]:xl:px-6 [&>*:first-child]:xl:border-l-0 [&>*:first-child]:xl:pl-0",
        className,
      )}
    >
      {children}
    </Card>
  );
}

/** Mini-histogramme : barres pâles, la dernière (mois en cours) pleine. */
function Sparkline({ values, className }: { values: number[]; className?: string }) {
  const max = Math.max(1, ...values);
  const w = 6;
  const gap = 3;
  return (
    <svg
      width={values.length * (w + gap) - gap}
      height={30}
      viewBox={`0 0 ${values.length * (w + gap) - gap} 30`}
      className={cn("shrink-0", className)}
      aria-hidden="true"
    >
      {values.map((v, i) => {
        const h = Math.max(3, Math.round((v / max) * 28));
        return (
          <rect
            key={i}
            x={i * (w + gap)}
            y={30 - h}
            width={w}
            height={h}
            rx={2}
            fill="currentColor"
            fillOpacity={i === values.length - 1 ? 1 : 0.25}
          />
        );
      })}
    </svg>
  );
}

/**
 * Indicateur du bandeau : libellé avec pastille de couleur, grande valeur et
 * sous-titre en pastille. `tint` porte les classes de fond/texte (ex.
 * « bg-success/15 text-success ») ; pastille, mini-histogramme et sous-titre
 * en reprennent la couleur. Avec `trend`, le mini-histogramme remplace l'icône.
 */
export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tint,
  trend,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tint: string;
  trend?: number[];
}) {
  const textClass = tint.split(" ").find((c) => c.startsWith("text-"));
  return (
    <div className="flex min-w-0 flex-col gap-2 sm:pr-4">
      <p className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
        <span className={cn("size-2 shrink-0 rounded-[3px] bg-current", textClass)} aria-hidden="true" />
        <span className="truncate">{label}</span>
      </p>
      <div className="flex items-end justify-between gap-3">
        <p className="truncate font-display text-[1.75rem] font-extrabold leading-tight tracking-tight text-foreground">{value}</p>
        {trend && trend.length > 1 && trend.some((v) => v > 0) ? (
          <Sparkline values={trend} className={textClass} />
        ) : (
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-xl", tint)}>
            <Icon className="size-[18px]" />
          </span>
        )}
      </div>
      {sub ? (
        <p className={cn("w-fit rounded-md px-2 py-0.5 text-xs font-semibold", tint)}>{sub}</p>
      ) : null}
    </div>
  );
}
