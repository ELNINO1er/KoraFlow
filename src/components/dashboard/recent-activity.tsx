import { ArrowRight, Circle } from "lucide-react";
import { cn } from "@/lib/utils";
import { DEMO_ACTIVITY } from "@/lib/constants/demo-dashboard";

const TONE: Record<string, string> = {
  accent: "bg-accent/15 text-accent",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/15 text-success",
  warning: "bg-warning/15 text-warning",
};

export function RecentActivity() {
  return (
    <ul className="flex flex-col divide-y divide-border">
      {DEMO_ACTIVITY.map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span
            className={cn(
              "flex size-8 shrink-0 items-center justify-center rounded-full",
              TONE[item.tone] ?? TONE.primary,
            )}
          >
            <Circle className="size-3 fill-current" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {item.title}
            </p>
            <p className="truncate text-xs text-muted-foreground">
              {item.subtitle}
            </p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {item.time}
          </span>
        </li>
      ))}
      <li className="pt-3">
        <button
          type="button"
          className="inline-flex items-center gap-1 text-sm font-medium text-accent hover:underline"
        >
          Voir tout <ArrowRight className="size-4" />
        </button>
      </li>
    </ul>
  );
}
