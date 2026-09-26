import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getOrganizationData } from "@/server/services/platform-admin";
import { formatCurrency, formatShortDate } from "@/lib/formatting/currency";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Données de l'organisation" };

export default async function AdminOrgDataPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const data = await getOrganizationData(id);
  if (!data) notFound();

  const { org, contacts, quotes, invoices, projects } = data;

  return (
    <div className="flex flex-col gap-6">
      <Link
        href={`/admin/organizations/${org.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" /> Fiche de {org.name}
      </Link>

      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Données — {org.name}
        </h1>
        <p className="text-sm text-muted-foreground">
          Consultation en lecture seule (support). 50 éléments récents par catégorie.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Contacts ({contacts.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-border">
            {contacts.map((c) => (
              <li key={c.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">
                    {c.firstName} {c.lastName ?? ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{c.email ?? "—"}</p>
                </div>
                <Badge variant="outline">{c.type}</Badge>
              </li>
            ))}
            {contacts.length === 0 ? <li className="py-2 text-sm text-muted-foreground">Aucun contact.</li> : null}
          </ul>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Devis ({quotes.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {quotes.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-foreground">{q.number}</p>
                    <p className="text-xs text-muted-foreground">{formatShortDate(q.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-foreground">{formatCurrency(q.totalMinor, q.currency)}</p>
                    <Badge variant="outline">{q.status}</Badge>
                  </div>
                </li>
              ))}
              {quotes.length === 0 ? <li className="py-2 text-sm text-muted-foreground">Aucun devis.</li> : null}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Factures ({invoices.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {invoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-foreground">{inv.number}</p>
                    <p className="text-xs text-muted-foreground">{formatShortDate(inv.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-foreground">{formatCurrency(inv.totalMinor, inv.currency)}</p>
                    <Badge variant="outline">{inv.status}</Badge>
                  </div>
                </li>
              ))}
              {invoices.length === 0 ? <li className="py-2 text-sm text-muted-foreground">Aucune facture.</li> : null}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Projets ({projects.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-border">
            {projects.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{p.title}</p>
                  <p className="text-xs text-muted-foreground">{p.progress}% · {formatShortDate(p.createdAt)}</p>
                </div>
                <Badge variant="outline">{p.status}</Badge>
              </li>
            ))}
            {projects.length === 0 ? <li className="py-2 text-sm text-muted-foreground">Aucun projet.</li> : null}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
