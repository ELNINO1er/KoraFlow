import type { Metadata } from "next";
import { Users, FileText, Wallet, FolderKanban, Info } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
  CardDescription,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatCard } from "@/components/dashboard/stat-card";
import { RevenueChart } from "@/components/dashboard/revenue-chart";
import { RecentActivity } from "@/components/dashboard/recent-activity";
import { ProjectsOverview } from "@/components/dashboard/projects-overview";
import { MobileMoneyStatus } from "@/components/dashboard/mobile-money-status";
import { DEMO_STATS } from "@/lib/constants/demo-dashboard";
import { formatCurrency, formatLongDate } from "@/lib/formatting/currency";

export const metadata: Metadata = { title: "Tableau de bord" };

const STAT_ICONS = [Users, FileText, Wallet, FolderKanban];
const STAT_TINTS = [
  "bg-primary/10 text-primary",
  "bg-accent/15 text-accent",
  "bg-success/15 text-success",
  "bg-warning/15 text-warning",
];

export default async function DashboardPage() {
  const ctx = await requireAuthContext();
  const localeTag = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const firstName = ctx.user.name?.trim().split(" ")[0] ?? "à vous";

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      {/* En-tête réel */}
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Bonjour {firstName}
          </h1>
          <p className="text-sm text-muted-foreground">
            Voici un aperçu de l’activité de {ctx.organization.name} aujourd’hui.
          </p>
        </div>
        <p className="text-sm capitalize text-muted-foreground">
          {formatLongDate(new Date(), localeTag)}
        </p>
      </div>

      {/* Bandeau honnêteté : données de démonstration */}
      <div className="flex items-start gap-2 rounded-lg border border-border bg-muted/50 px-4 py-3 text-sm text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-accent" />
        <p>
          Les statistiques ci-dessous sont des{" "}
          <span className="font-medium text-foreground">
            données de démonstration
          </span>{" "}
          : elles seront remplacées par vos chiffres réels au fur et à mesure de
          l’activation des modules CRM, devis et paiements.
        </p>
      </div>

      {/* Cartes KPI */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {DEMO_STATS.map((stat, i) => (
          <StatCard
            key={stat.key}
            label={stat.label}
            value={
              stat.isCurrency
                ? formatCurrency(stat.value, ctx.organization.currency, localeTag)
                : stat.value.toLocaleString(localeTag)
            }
            delta={stat.deltaLabel}
            deltaPositive={stat.deltaPositive}
            icon={STAT_ICONS[i] ?? Users}
            tint={STAT_TINTS[i] ?? STAT_TINTS[0]!}
          />
        ))}
      </div>

      {/* CA + Activité */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between">
            <div>
              <CardTitle>Chiffre d’affaires</CardTitle>
              <CardDescription>Évolution mensuelle (FCFA)</CardDescription>
            </div>
            <Badge variant="outline">Démo</Badge>
          </CardHeader>
          <CardContent>
            <RevenueChart currency={ctx.organization.currency} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activité récente</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentActivity />
          </CardContent>
        </Card>
      </div>

      {/* Projets + Mobile Money */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Projets en cours</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectsOverview />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Paiements Mobile Money</CardTitle>
            <CardDescription>Répartition par opérateur</CardDescription>
          </CardHeader>
          <CardContent>
            <MobileMoneyStatus currency={ctx.organization.currency} />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
