import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Search, Users } from "lucide-react";
import type { ContactStage } from "@prisma/client";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { listContacts } from "@/server/services/contact-service";
import { CONTACT_STAGES, stageLabel, stageVariant, contactTypeLabel } from "@/lib/constants/crm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Clients" };

const VALID_STAGES = new Set(CONTACT_STAGES.map((s) => s.value));

function buildQuery(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) sp.set(k, v);
  }
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; stage?: string; page?: string }>;
}) {
  const ctx = await requireAuthContext();
  const sp = await searchParams;

  const q = sp.q?.trim() || undefined;
  const stage =
    sp.stage && VALID_STAGES.has(sp.stage as ContactStage)
      ? (sp.stage as ContactStage)
      : undefined;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);

  const { items, total, pageSize } = await listContacts(ctx, {
    search: q,
    stage,
    page,
  });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canCreate = can(ctx.role, "contacts.create");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {total} contact{total > 1 ? "s" : ""} · prospects et clients
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/clients/nouveau">
              <Plus className="size-4" />
              Nouveau contact
            </Link>
          </Button>
        ) : null}
      </div>

      {/* Recherche + filtre pipeline */}
      <div className="flex flex-col gap-3">
        <form method="get" className="relative max-w-md">
          {stage ? <input type="hidden" name="stage" value={stage} /> : null}
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="search"
            name="q"
            defaultValue={q}
            placeholder="Rechercher un contact…"
            className="h-10 w-full rounded-full border border-border bg-surface pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </form>

        <div className="flex flex-wrap gap-2">
          <Link
            href={`/clients${buildQuery({ q })}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              !stage
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            Tous
          </Link>
          {CONTACT_STAGES.map((s) => (
            <Link
              key={s.value}
              href={`/clients${buildQuery({ q, stage: s.value })}`}
              className={cn(
                "rounded-full border px-3 py-1 text-xs font-medium",
                stage === s.value
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border text-muted-foreground hover:bg-muted",
              )}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {/* Tableau */}
      {items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted">
            <Users className="size-6 text-muted-foreground" />
          </span>
          <p className="font-medium text-foreground">Aucun contact</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {q || stage
              ? "Aucun contact ne correspond à votre recherche."
              : "Créez votre premier prospect pour démarrer votre pipeline commercial."}
          </p>
          {canCreate && !q && !stage ? (
            <Button asChild className="mt-2">
              <Link href="/clients/nouveau">
                <Plus className="size-4" />
                Nouveau contact
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
                  <th className="px-4 py-3 font-medium">Entreprise</th>
                  <th className="px-4 py-3 font-medium">Contact</th>
                  <th className="px-4 py-3 font-medium">Étape</th>
                  <th className="px-4 py-3 font-medium">Type</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border last:border-0 hover:bg-muted/50"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/clients/${c.id}`}
                        className="font-medium text-foreground hover:text-accent"
                      >
                        {c.firstName} {c.lastName ?? ""}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.companyName ?? "—"}
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {c.email ?? c.phone ?? "—"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={stageVariant(c.stage)}>
                        {stageLabel(c.stage)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">
                      {contactTypeLabel(c.type)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {/* Pagination */}
      {totalPages > 1 ? (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {page} sur {totalPages}
          </p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/clients${buildQuery({ q, stage, page: String(page - 1) })}`}>
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
                <Link href={`/clients${buildQuery({ q, stage, page: String(page + 1) })}`}>
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
