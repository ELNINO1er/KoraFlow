"use client";

import { useState } from "react";
import { Area, CartesianGrid, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { cn } from "@/lib/utils";
import { formatCurrency, minorUnitsFor } from "@/lib/formatting/currency";

const RANGES = [
  { value: "3m", label: "3 mois", months: 3 },
  { value: "6m", label: "6 mois", months: 6 },
  { value: "12m", label: "12 mois", months: 12 },
] as const;
type Range = (typeof RANGES)[number]["value"];

export interface RevenuePoint {
  month: string;
  /** Encaissé (paiements confirmés), plus petite unité. */
  value: number;
  /** Facturé (factures émises), plus petite unité. */
  billed: number;
  /** Nombre de paiements confirmés du mois. */
  count: number;
}

/** Montant compact (« 8,1 M FCFA ») à partir de la plus petite unité. */
function compactMoney(amountMinor: number, currency: string): string {
  const major = amountMinor / 10 ** minorUnitsFor(currency);
  const n = new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(major);
  return `${n} ${currency.toUpperCase() === "XOF" ? "FCFA" : currency.toUpperCase()}`;
}

function ChartTooltip({
  active,
  payload,
  label,
  currency,
}: {
  active?: boolean;
  payload?: { payload: RevenuePoint }[];
  label?: string;
  currency: string;
}) {
  const point = payload?.[0]?.payload;
  if (!active || !point) return null;
  return (
    <div className="rounded-xl bg-[var(--kf-ink)] px-3.5 py-2.5 text-white shadow-e3">
      <p className="font-display text-[15px] font-extrabold">{formatCurrency(point.value, currency)}</p>
      <p className="text-xs text-[#c9d4df]">
        {label} · {point.count} paiement{point.count > 1 ? "s" : ""}
      </p>
      <p className="mt-1 text-xs text-[#c9d4df]">Facturé : {formatCurrency(point.billed, currency)}</p>
    </div>
  );
}

/**
 * Carte « Encaissements » : encaissé (aire verte) vs facturé (ligne pointillée),
 * légende, sélecteur de période et bulle de détail au survol.
 */
export function RevenueChart({
  data,
  currency = "XOF",
}: {
  data: RevenuePoint[];
  currency?: string;
}) {
  const [range, setRange] = useState<Range>("12m");
  const months = RANGES.find((r) => r.value === range)?.months ?? 12;
  const shown = data.slice(-months);
  const unit = currency.toUpperCase() === "XOF" ? "FCFA" : currency.toUpperCase();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-48 flex-1">
          <h2 className="font-display text-lg font-bold text-foreground">Encaissements</h2>
          <p className="text-sm text-muted-foreground">Encaissé vs facturé, en {unit}</p>
        </div>
        <div className="flex items-center gap-4 text-xs text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <span className="h-[3px] w-3.5 rounded-full bg-primary" aria-hidden="true" />
            Encaissé
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3.5 border-t-2 border-dashed border-foreground/60" aria-hidden="true" />
            Facturé
          </span>
        </div>
        <div className="inline-flex rounded-xl bg-muted p-1" role="group" aria-label="Période">
          {RANGES.map((r) => (
            <button
              key={r.value}
              type="button"
              onClick={() => setRange(r.value)}
              aria-pressed={r.value === range}
              className={cn(
                "rounded-lg px-3 py-1.5 text-[13px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                r.value === range ? "bg-surface font-semibold text-foreground shadow-e1" : "text-muted-foreground hover:text-foreground",
              )}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={280}>
        <ComposedChart data={shown} margin={{ top: 16, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="var(--color-border)" />
          <XAxis
            dataKey="month"
            tickLine={false}
            axisLine={false}
            tickMargin={10}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
          />
          <YAxis
            width={64}
            tickLine={false}
            axisLine={false}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
            tickFormatter={(v: number) => compactMoney(v, currency).replace(` ${unit}`, "")}
          />
          <Tooltip
            content={<ChartTooltip currency={currency} />}
            cursor={{ stroke: "var(--color-primary)", strokeOpacity: 0.45, strokeDasharray: "3 3" }}
          />
          <Area
            type="linear"
            dataKey="value"
            stroke="var(--color-primary)"
            strokeWidth={3}
            strokeLinejoin="round"
            fill="var(--color-primary)"
            fillOpacity={0.12}
            dot={false}
            activeDot={{ r: 6, fill: "var(--color-surface)", stroke: "var(--color-primary)", strokeWidth: 3 }}
          />
          <Line
            type="linear"
            dataKey="billed"
            stroke="var(--color-foreground)"
            strokeOpacity={0.55}
            strokeWidth={2}
            strokeDasharray="5 5"
            dot={false}
            activeDot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
