import type { Metadata } from "next";
import Link from "next/link";
import { Plus, Users, Download } from "lucide-react";
import type { ContactStage } from "@prisma/client";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { listContacts } from "@/server/services/contact-service";
import { CONTACT_STAGES, stageLabel, stageVariant, contactTypeLabel } from "@/lib/constants/crm";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Pagination } from "@/components/ui/pagination";
import { ListSearch } from "@/components/app/list-search";
import { ImportContactsDialog } from "@/features/contacts/import-dialog";
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
  const canView = can(ctx.role, "contacts.view");
  const exportHref = `/api/clients/export${buildQuery({ q, stage })}`;

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight text-foreground">Clients</h1>
          <p className="text-sm text-muted-foreground">
            {total} contact{total > 1 ? "s" : ""} · prospects et clients
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {canView ? (
            <Button asChild variant="outline">
              <a href={exportHref}><Download className="size-4" />Exporter Excel</a>
            </Button>
          ) : null}
          {canCreate ? <ImportContactsDialog /> : null}
          {canCreate ? (
            <Button asChild>
              <Link href="/clients/nouveau">
                <Plus className="size-4" />
                Nouveau contact
              </Link>
            </Button>
          ) : null}
        </div>
      </div>

      {/* Recherche + filtre pipeline */}
      <div className="flex flex-col gap-3">
        <ListSearch placeholder="Rechercher un contact…" />

        <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-xl bg-surface p-1 shadow-e1 ring-1 ring-border/60">
          <Link
            href={`/clients${buildQuery({ q })}`}
            className={cn(
              "rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors",
              !stage
                ? "bg-primary font-semibold text-primary-foreground shadow-e1"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            Tous
          </Link>
          {CONTACT_STAGES.map((s) => (
            <Link
              key={s.value}
              href={`/clients${buildQuery({ q, stage: s.value })}`}
              className={cn(
                "rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors",
                stage === s.value
                  ? "bg-primary font-semibold text-primary-foreground shadow-e1"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
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
          <div className="overflow-x-auto p-2">
            <table className="kf-table text-sm">
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
      <Pagination
        page={page}
        totalPages={totalPages}
        makeHref={(p) => `/clients${buildQuery({ q, stage, page: String(p) })}`}
      />
    </div>
  );
}
