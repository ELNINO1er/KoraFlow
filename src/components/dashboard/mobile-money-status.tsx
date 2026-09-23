import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatting/currency";

const META: Record<string, { label: string; initial: string; colorClass: string }> = {
  WAVE: { label: "Wave", initial: "W", colorClass: "bg-[#1DC3EB]" },
  ORANGE_MONEY: { label: "Orange Money", initial: "O", colorClass: "bg-[#FF7900]" },
  MTN: { label: "MTN", initial: "M", colorClass: "bg-[#F5B700]" },
};

export function MobileMoneyStatus({
  items,
  currency = "XOF",
  localeTag = "fr-FR",
}: {
  items: { method: string; amountMinor: number; count: number }[];
  currency?: string;
  localeTag?: string;
}) {
  return (
    <ul className="flex flex-col gap-3">
      {items.map((item) => {
        const meta = META[item.method] ?? { label: item.method, initial: "?", colorClass: "bg-muted-foreground" };
        return (
          <li key={item.method} className="flex items-center gap-3 rounded-lg border border-border bg-background p-3">
            <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white", meta.colorClass)}>
              {meta.initial}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground">{meta.label}</p>
              <p className="text-xs text-muted-foreground">{formatCurrency(item.amountMinor, currency, localeTag)}</p>
            </div>
            <div className="text-right">
              {item.count > 0 ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
                  <CheckCircle2 className="size-3.5" />
                  Confirmés
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">—</span>
              )}
              <p className="text-xs text-muted-foreground">{item.count} transaction{item.count > 1 ? "s" : ""}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
