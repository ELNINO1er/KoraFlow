import type { Metadata } from "next";
import Link from "next/link";
import { Wallet, ReceiptText, AlertCircle, FileText, TrendingUp, Users, UserCheck } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { getReport, type ReportPeriod } from "@/server/services/reports-service";
import { formatCurrency } from "@/lib/formatting/currency";
import { StatCard } from "@/components/dashboard/stat-card";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Rapports" };

const PERIODS: { value: ReportPeriod; label: string }[] = [
  { value: "mois", label: "Ce mois" },
  { value: "trimestre", label: "Ce trimestre" },
  { value: "annee", label: "Cette année" },
];

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "reports.view")) redirect("/dashboard");

  const sp = await searchParams;
  const period: ReportPeriod = sp.period === "trimestre" || sp.period === "annee" ? sp.period : "mois";
  const localeTag = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const money = (m: number) => formatCurrency(m, ctx.organization.currency, localeTag);

  const data = await getReport(ctx, period);
  const dtf = new Intl.DateTimeFormat(localeTag, { dateStyle: "long", timeZone: "UTC" });
  const toDisplay = new Date(data.to.getTime() - 1);

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Rapports</h1>
          <p className="text-sm text-muted-foreground">
            Du {dtf.format(data.from)} au {dtf.format(toDisplay)}
          </p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p.value}
              href={`/rapports?period=${p.value}`}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                period === p.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <StatCard label="CA encaissé" value={money(data.collectedMinor)} sub="paiements confirmés" icon={Wallet} tint="bg-success/15 text-success" />
        <StatCard label="Facturé" value={money(data.billedMinor)} sub="factures émises" icon={ReceiptText} tint="bg-primary/10 text-primary" />
        <StatCard label="Reste à encaisser" value={money(data.outstandingMinor)} sub="factures impayées (tous exercices)" icon={AlertCircle} tint="bg-warning/15 text-warning" />
        <StatCard label="Devis émis" value={data.quotesTotal.toLocaleString(localeTag)} sub={`${data.quotesAccepted} accepté${data.quotesAccepted > 1 ? "s" : ""}`} icon={FileText} tint="bg-accent/15 text-accent" />
        <StatCard label="Taux de conversion" value={`${data.conversionRate} %`} sub="devis traités → acceptés" icon={TrendingUp} tint="bg-primary/10 text-primary" />
        <StatCard label="Nouveaux prospects" value={data.newProspects.toLocaleString(localeTag)} sub={`${data.newClients} nouveau${data.newClients > 1 ? "x" : ""} client${data.newClients > 1 ? "s" : ""}`} icon={Users} tint="bg-accent/15 text-accent" />
      </div>

      <p className="text-xs text-muted-foreground">
        <UserCheck className="mr-1 inline size-3.5" />
        Chiffres calculés en temps réel sur les données de votre organisation.
      </p>
    </div>
  );
}
