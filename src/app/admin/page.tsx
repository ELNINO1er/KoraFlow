import Link from "next/link";
import { Building2, Users, ShieldCheck, FileText, Ban, Contact2 } from "lucide-react";
import { getPlatformOverview } from "@/server/services/platform-admin";
import { Money } from "@/components/ui/money";
import { DateText } from "@/components/ui/date-text";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatBand, StatCard } from "@/components/dashboard/stat-card";
import { requirePlatformAdmin } from "@/server/auth/platform";

export default async function AdminOverviewPage() {
  await requirePlatformAdmin();
  const o = await getPlatformOverview();

  const revenueEntries = Object.entries(o.revenueByCurrency);

  const stats = [
    { label: "Organisations", value: o.orgCount, icon: Building2, sub: o.orgSuspended > 0 ? `${o.orgSuspended} suspendue(s)` : "toutes actives", tint: o.orgSuspended > 0 ? "bg-warm/15 text-warm-strong" : "bg-primary/10 text-primary" },
    { label: "Utilisateurs", value: o.userCount, icon: Users, sub: o.userSuspended > 0 ? `${o.userSuspended} suspendu(s)` : "tous actifs", tint: o.userSuspended > 0 ? "bg-warm/15 text-warm-strong" : "bg-primary/10 text-primary" },
    { label: "Admins plateforme", value: o.adminCount, icon: ShieldCheck, sub: "accès transverse", tint: "bg-secondary text-foreground" },
    { label: "Contacts (toutes orgs)", value: o.contactCount, icon: Contact2, sub: "prospects + clients", tint: "bg-success/15 text-success" },
    { label: "Factures (toutes orgs)", value: o.invoiceCount, icon: FileText, sub: "tous statuts", tint: "bg-secondary text-foreground" },
  ];

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight text-foreground">
          Vue d&apos;ensemble de la plateforme
        </h1>
        <p className="text-sm text-muted-foreground">
          Indicateurs consolidés sur l&apos;ensemble des organisations.
        </p>
      </div>

      <StatBand className="lg:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <StatCard key={s.label} label={s.label} value={s.value.toLocaleString("fr-FR")} sub={s.sub} icon={s.icon} tint={s.tint} />
        ))}
      </StatBand>

      <Card>
        <CardHeader>
          <CardTitle>Encaissements des organisations (paiements confirmés)</CardTitle>
        </CardHeader>
        <CardContent>
          {revenueEntries.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun paiement confirmé pour l&apos;instant.</p>
          ) : (
            <div className="flex flex-wrap gap-6">
              {revenueEntries.map(([currency, amount]) => (
                <div key={currency}>
                  <p className="font-display text-2xl font-bold text-foreground">
                    <Money minor={amount} currency={currency} />
                  </p>
                  <p className="text-xs text-muted-foreground">en {currency}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dernières organisations</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {o.recentOrgs.map((org) => (
                <li key={org.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <Link href={`/admin/organizations/${org.id}`} className="truncate text-sm font-medium text-foreground hover:underline">
                      {org.name}
                    </Link>
                    <p className="truncate text-xs text-muted-foreground">
                      créée le <DateText value={org.createdAt} />
                    </p>
                  </div>
                  {org.suspendedAt ? (
                    <Badge variant="danger">
                      <Ban className="size-3" /> suspendue
                    </Badge>
                  ) : null}
                </li>
              ))}
              {o.recentOrgs.length === 0 ? (
                <li className="py-2 text-sm text-muted-foreground">Aucune organisation.</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Derniers utilisateurs</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {o.recentUsers.map((u) => (
                <li key={u.id} className="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{u.name ?? "—"}</p>
                    <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  </div>
                  {u.emailVerified ? (
                    <Badge variant="success">vérifié</Badge>
                  ) : (
                    <Badge variant="warning">non vérifié</Badge>
                  )}
                </li>
              ))}
              {o.recentUsers.length === 0 ? (
                <li className="py-2 text-sm text-muted-foreground">Aucun utilisateur.</li>
              ) : null}
            </ul>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
