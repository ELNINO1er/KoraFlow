import type { Metadata } from "next";
import Link from "next/link";
import { Users, FileText, Wallet, ReceiptText, FolderKanban } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { getDashboardData } from "@/server/services/dashboard-service";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
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
    { label: "Prospects", value: data.prospects.toLocaleString(localeTag), sub: "contacts à convertir", icon: Users, tint: "bg-primary/10 text-primary" },
    { label: "Devis en attente", value: data.quotesAwaiting.toLocaleString(localeTag), sub: "envoyés ou consultés", icon: FileText, tint: "bg-accent/15 text-accent" },
    { label: "Paiements reçus", value: formatCurrency(data.receivedMinor, currency, localeTag), sub: "encaissé (confirmé)", icon: Wallet, tint: "bg-success/15 text-success" },
    { label: "Factures impayées", value: data.unpaidInvoices.toLocaleString(localeTag), sub: "à recouvrer", icon: ReceiptText, tint: "bg-warning/15 text-warning" },
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

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {kpis.map((k, i) => (
          <div key={k.label} className="app-enter" style={{ animationDelay: `${60 + i * 60}ms` }}>
            <StatCard label={k.label} value={k.value} sub={k.sub} icon={k.icon} tint={k.tint} />
          </div>
        ))}
      </div>

      <div className="app-enter grid gap-6 lg:grid-cols-3" style={{ animationDelay: "300ms" }}>
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chiffre d&apos;affaires encaissé</CardTitle>
            <CardDescription>Paiements confirmés par mois</CardDescription>
          </CardHeader>
          <CardContent>
            <RevenueChart data={data.revenueByMonth} currency={currency} />
          </CardContent>
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
