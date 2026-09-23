import type { Metadata } from "next";
import { Users, FileText, Wallet, ReceiptText, FolderKanban } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { getDashboardData } from "@/server/services/dashboard-service";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { MobileMoneyStatus } from "@/components/dashboard/mobile-money-status";
import { formatCurrency, formatLongDate } from "@/lib/formatting/currency";

export const metadata: Metadata = { title: "Tableau de bord" };

export default async function DashboardPage() {
  const ctx = await requireAuthContext();
  const localeTag = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const firstName = ctx.user.name?.trim().split(" ")[0] ?? "à vous";
  const currency = ctx.organization.currency;

  const data = await getDashboardData(ctx);
  const nowMs = data.nowMs;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Bonjour {firstName}</h1>
          <p className="text-sm text-muted-foreground">
            Voici un aperçu de l’activité de {ctx.organization.name} aujourd’hui.
          </p>
        </div>
        <p className="text-sm capitalize text-muted-foreground">
          {formatLongDate(new Date(nowMs), localeTag)}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Prospects" value={data.prospects.toLocaleString(localeTag)} sub="contacts à convertir" icon={Users} tint="bg-primary/10 text-primary" />
        <StatCard label="Devis en attente" value={data.quotesAwaiting.toLocaleString(localeTag)} sub="envoyés ou consultés" icon={FileText} tint="bg-accent/15 text-accent" />
        <StatCard label="Paiements reçus" value={formatCurrency(data.receivedMinor, currency, localeTag)} sub="encaissé (confirmé)" icon={Wallet} tint="bg-success/15 text-success" />
        <StatCard label="Factures impayées" value={data.unpaidInvoices.toLocaleString(localeTag)} sub="à recouvrer" icon={ReceiptText} tint="bg-warning/15 text-warning" />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Chiffre d’affaires encaissé</CardTitle>
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

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Projets en cours</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border py-10 text-center">
              <FolderKanban className="size-6 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Le module Projets arrive au prochain sprint (création automatique
                après paiement).
              </p>
            </div>
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
