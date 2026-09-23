import { Circle } from "lucide-react";
import { actionLabel, relativeTime } from "@/lib/activity";

export function RecentActivity({
  items,
  nowMs,
  localeTag,
}: {
  items: { id: string; action: string; createdAt: Date }[];
  nowMs: number;
  localeTag: string;
}) {
  if (items.length === 0) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        Aucune activité récente pour le moment.
      </p>
    );
  }

  return (
    <ul className="flex flex-col divide-y divide-border">
      {items.map((item) => (
        <li key={item.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-accent">
            <Circle className="size-3 fill-current" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">{actionLabel(item.action)}</p>
          </div>
          <span className="shrink-0 text-xs text-muted-foreground">
            {relativeTime(item.createdAt, nowMs, localeTag)}
          </span>
        </li>
      ))}
    </ul>
  );
}
