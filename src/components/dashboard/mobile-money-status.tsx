import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatting/currency";
import { DEMO_MOBILE_MONEY } from "@/lib/constants/demo-dashboard";

export function MobileMoneyStatus({ currency = "XOF" }: { currency?: string }) {
  return (
    <ul className="flex flex-col gap-3">
      {DEMO_MOBILE_MONEY.map((item) => (
        <li
          key={item.provider}
          className="flex items-center gap-3 rounded-lg border border-border bg-background p-3"
        >
          <span
            className={cn(
              "flex size-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white",
              item.colorClass,
            )}
          >
            {item.initial}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-foreground">
              {item.provider}
            </p>
            <p className="text-xs text-muted-foreground">
              {formatCurrency(item.amountMinor, currency)}
            </p>
          </div>
          <div className="text-right">
            <span className="inline-flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircle2 className="size-3.5" />
              Confirmés
            </span>
            <p className="text-xs text-muted-foreground">
              {item.transactions} transactions
            </p>
          </div>
        </li>
      ))}
    </ul>
  );
}
