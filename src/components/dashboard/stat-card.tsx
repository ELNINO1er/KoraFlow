import type { LucideIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tint,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: LucideIcon;
  tint: string;
}) {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm text-muted-foreground">{label}</p>
          <p className="mt-2 font-display text-2xl font-bold text-foreground">{value}</p>
        </div>
        <span className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg", tint)}>
          <Icon className="size-5" />
        </span>
      </div>
      {sub ? <p className="mt-3 text-xs text-muted-foreground">{sub}</p> : null}
    </Card>
  );
}
