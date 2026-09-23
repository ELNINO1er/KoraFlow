"use client";

import { useState } from "react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatting/currency";

const RANGES = ["3m", "6m", "12m"] as const;
type Range = (typeof RANGES)[number];
const RANGE_MONTHS: Record<Range, number> = { "3m": 3, "6m": 6, "12m": 12 };

export function RevenueChart({
  data,
  currency = "XOF",
}: {
  data: { month: string; value: number }[];
  currency?: string;
}) {
  const [range, setRange] = useState<Range>("12m");
  const shown = data.slice(-RANGE_MONTHS[range]);

  return (
    <div>
      <div className="mb-4 flex items-center justify-end">
        <div className="inline-flex rounded-lg border border-border bg-background p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                r === range ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={shown} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }} />
          <Tooltip
            cursor={{ fill: "var(--color-muted)" }}
            formatter={(value) => [formatCurrency(Number(value ?? 0), currency), "Encaissé"]}
            contentStyle={{
              background: "var(--color-surface)",
              border: "1px solid var(--color-border)",
              borderRadius: "0.5rem",
              fontSize: "0.8rem",
              color: "var(--color-foreground)",
            }}
          />
          <Bar dataKey="value" fill="var(--color-primary)" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
