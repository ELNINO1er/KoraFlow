import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search, Package } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { listServices } from "@/server/services/catalog-service";
import { formatCurrency } from "@/lib/formatting/currency";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Catalogue de services" };

export default async function ServicesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const ctx = await requireAuthContext();
  const sp = await searchParams;
  const q = sp.q?.trim() || undefined;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const localeTag = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;

  const { items, total, pageSize } = await listServices(ctx, { search: q, page });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canCreate = can(ctx.role, "services.create");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Catalogue de services
          </h1>
          <p className="text-sm text-muted-foreground">
            {total} service{total > 1 ? "s" : ""} · offres facturables
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/services/nouveau">
              <Plus className="size-4" />
              Nouveau service
            </Link>
          </Button>
        ) : null}
      </div>

      <form method="get" className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Rechercher un service…"
          className="h-10 w-full rounded-full border border-border bg-surface pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </form>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted">
            <Package className="size-6 text-muted-foreground" />
          </span>
          <p className="font-medium text-foreground">Aucun service</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {q
              ? "Aucun service ne correspond à votre recherche."
              : "Créez vos offres pour les réutiliser dans vos devis et factures."}
          </p>
          {canCreate && !q ? (
            <Button asChild className="mt-2">
              <Link href="/services/nouveau">
                <Plus className="size-4" />
                Nouveau service
              </Link>
            </Button>
          ) : null}
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Nom</th>
                  <th className="px-4 py-3 font-medium">Catégorie</th>
                  <th className="px-4 py-3 font-medium">Prix HT</th>
                  <th className="px-4 py-3 font-medium">Unité</th>
                  <th className="px-4 py-3 font-medium">Taxe</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {items.map((s) => (
                  <tr
                    key={s.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/services/${s.id}`}
                        className="font-medium text-foreground hover:text-accent"
                      >
                        {s.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {s.category ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {formatCurrency(s.priceMinor, ctx.organization.currency, localeTag)}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{s.unit}</td>
                    <td className="px-4 py-3 text-muted-foreground">{s.taxRate} %</td>
                    <td className="px-4 py-3">
                      {s.active ? (
                        <Badge variant="success">Actif</Badge>
                      ) : (
                        <Badge variant="outline">Inactif</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} sur {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/services?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page - 1) })}`}>
                  Précédent
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Précédent
              </Button>
            )}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/services?${new URLSearchParams({ ...(q ? { q } : {}), page: String(page + 1) })}`}>
                  Suivant
                </Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>
                Suivant
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
