import type { Metadata } from "next";
import Link from "next/link";
import { Users, FileText, Wallet, ReceiptText, FolderKanban } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { getDashboardData } from "@/server/services/dashboard-service";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatBand, StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { MobileMoneyStatus } from "@/components/dashboard/mobile-money-status";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/app/empty-state";
import { formatCurrency, formatLongDate } from "@/lib/formatting/currency";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const ctx = await requireAuthContext();
  const localeTag = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const firstName = ctx.user.name?.trim().split(" ")[0] ?? "à vous";
  const currency = ctx.organization.currency;

  const data = await getDashboardData(ctx);
  const nowMs = data.nowMs;

  const kpis = [
    { label: "Prospects", value: data.prospects.toLocaleString(localeTag), sub: "contacts à convertir", icon: Users, tint: "bg-primary/10 text-primary", trend: data.trends.prospects },
    { label: "Devis en attente", value: data.quotesAwaiting.toLocaleString(localeTag), sub: "envoyés ou consultés", icon: FileText, tint: "bg-secondary text-foreground", trend: data.trends.quotes },
    { label: "Paiements reçus", value: formatCurrency(data.receivedMinor, currency, localeTag), sub: "encaissé (confirmé)", icon: Wallet, tint: "bg-success/15 text-success", trend: data.trends.revenue },
    { label: "Factures impayées", value: data.unpaidInvoices.toLocaleString(localeTag), sub: data.overdueInvoices > 0 ? `à recouvrer · ${data.overdueInvoices} en retard` : "à recouvrer", icon: ReceiptText, tint: data.overdueInvoices > 0 ? "bg-warm/15 text-warm-strong" : "bg-secondary text-foreground", trend: data.trends.invoices },
  ];

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="app-enter">
        <PageHeader
          title={`Bonjour ${firstName}`}
          description={`Voici un aperçu de l'activité de ${ctx.organization.name} aujourd'hui.`}
          actions={
            <span className="text-sm capitalize text-muted-foreground">
              {formatLongDate(new Date(nowMs), localeTag)}
            </span>
          }
        />
      </div>

      <div className="app-enter" style={{ animationDelay: "60ms" }}>
        <StatBand>
          {kpis.map((k) => (
            <StatCard key={k.label} label={k.label} value={k.value} sub={k.sub} icon={k.icon} tint={k.tint} trend={k.trend} />
          ))}
        </StatBand>
      </div>

      <div className="app-enter grid gap-6 lg:grid-cols-3" style={{ animationDelay: "300ms" }}>
        <Card className="p-6 lg:col-span-2">
          <RevenueChart data={data.revenueByMonth} currency={currency} />
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity items={data.recentActivity} nowMs={nowMs} localeTag={localeTag} />
          </CardContent>
        </Card>
      </div>

      <div className="app-enter grid gap-6 lg:grid-cols-3" style={{ animationDelay: "360ms" }}>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Projets</CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icon={FolderKanban}
              title="Suivez vos projets au même endroit"
              description="Un projet se crée automatiquement au paiement d'une facture, puis avance par étapes et tâches."
              action={
                <Button asChild variant="outline">
                  <Link href="/projets">Ouvrir les projets</Link>
                </Button>
              }
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paiements Mobile Money</CardTitle>
            <CardDescription>Encaissé par opérateur</CardDescription>
          </CardHeader>
          <CardContent>
            <MobileMoneyStatus items={data.mobileMoney} currency={currency} localeTag={localeTag} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
