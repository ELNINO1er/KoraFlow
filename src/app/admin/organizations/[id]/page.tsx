import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Ban, Database } from "lucide-react";
import { getOrganizationDetail } from "@/server/services/platform-admin";
import { formatCurrency, formatShortDate, formatDateTime } from "@/lib/formatting/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrgSuspendToggle } from "@/features/admin/admin-controls";
import {
  OrgEditForm,
  OrgDeleteRestore,
  AddMemberForm,
  MemberRoleControl,
} from "@/features/admin/org-controls";

export const metadata: Metadata = { title: "Fiche organisation" };

export default async function AdminOrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getOrganizationDetail(id);
  if (!data) notFound();

  const { org, stats, recentAudit } = data;
  const deleted = Boolean(org.deletedAt);

  const cards = [
    { label: "Contacts", value: stats.contactCount },
    { label: "Devis", value: stats.quoteCount },
    { label: "Factures", value: stats.invoiceCount },
    { label: "Projets", value: stats.projectCount },
  ];

  return (
    <div className="flex flex-col gap-6">
      <Link
        href="/admin/organizations"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Toutes les organisations
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl font-bold text-foreground">{org.name}</h1>
            {deleted ? (
              <Badge variant="danger">supprimée</Badge>
            ) : org.suspendedAt ? (
              <Badge variant="danger">
                <Ban className="size-3" /> suspendue
              </Badge>
            ) : (
              <Badge variant="success">active</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">
            /{org.slug} · {org.currency} · créée le {formatShortDate(org.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/admin/organizations/${org.id}/donnees`}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted"
          >
            <Database className="size-4" />
            Voir les données
          </Link>
          {!deleted ? <OrgSuspendToggle orgId={org.id} suspended={Boolean(org.suspendedAt)} /> : null}
          <OrgDeleteRestore orgId={org.id} deleted={deleted} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-5">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex flex-col gap-1 pt-6">
              <span className="text-xs font-medium text-muted-foreground">{c.label}</span>
              <span className="font-display text-2xl font-bold text-foreground">{c.value}</span>
            </CardContent>
          </Card>
        ))}
        <Card>
          <CardContent className="flex flex-col gap-1 pt-6">
            <span className="text-xs font-medium text-muted-foreground">Revenu encaissé</span>
            <span className="font-display text-xl font-bold text-foreground">
              {formatCurrency(stats.revenueMinor, org.currency)}
            </span>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Profil de l&apos;organisation</CardTitle>
        </CardHeader>
        <CardContent>
          <OrgEditForm
            orgId={org.id}
            initial={{
              name: org.name,
              legalName: org.legalName,
              email: org.email,
              phone: org.phone,
              city: org.city,
              country: org.country,
              currency: org.currency,
              timezone: org.timezone,
              locale: org.locale,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Membres ({org.memberships.length})</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AddMemberForm orgId={org.id} />
          <ul className="flex flex-col divide-y divide-border">
            {org.memberships.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center gap-3 py-2.5 first:pt-0 last:pb-0">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {m.user.name ?? "—"}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                {m.user.suspendedAt ? <Badge variant="danger">compte suspendu</Badge> : null}
                <MemberRoleControl orgId={org.id} membershipId={m.id} current={m.role} />
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Activité récente (audit)</CardTitle>
        </CardHeader>
        <CardContent>
          {recentAudit.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune entrée d&apos;audit.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {recentAudit.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-foreground">{a.action}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {a.actor?.email ?? "système"}
                    </p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {formatDateTime(a.createdAt)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
