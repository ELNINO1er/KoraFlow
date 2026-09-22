import type { LucideIcon } from "lucide-react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  delta,
  deltaPositive,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  delta: string;
  deltaPositive: boolean;
  icon: LucideIcon;
  tint: string;
}) {
  const DeltaIcon = deltaPositive ? TrendingUp : TrendingDown;
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">
            {value}
          </p>
        </div>
        <span
          className={cn(
            "flex size-10 shrink-0 items-center justify-center rounded-lg",
            tint,
          )}
        >
          <Icon className="size-5" />
        </span>
      </div>
      <p
        className={cn(
          "mt-3 inline-flex items-center gap-1 text-xs font-medium",
          deltaPositive ? "text-success" : "text-danger",
        )}
      >
        <DeltaIcon className="size-3.5" />
        {delta}
      </p>
    </Card>
  );
}
