import type { Metadata } from "next";
import Link from "next/link";
import { Plus, FileText } from "lucide-react";
import type { QuoteStatus } from "@prisma/client";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { listQuotes } from "@/server/services/quote-service";
import { formatCurrency } from "@/lib/formatting/currency";
import { QUOTE_STATUSES, quoteStatusLabel, quoteStatusVariant } from "@/lib/constants/quotes";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Devis" };

const VALID = new Set(QUOTE_STATUSES.map((s) => s.value));

function contactName(c: {
  firstName: string;
  lastName: string | null;
  companyName: string | null;
}): string {
  if (c.companyName) return c.companyName;
  return `${c.firstName} ${c.lastName ?? ""}`.trim();
}

function query(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function QuotesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const ctx = await requireAuthContext();
  const sp = await searchParams;
  const status =
    sp.status && VALID.has(sp.status as QuoteStatus)
      ? (sp.status as QuoteStatus)
      : undefined;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const localeTag = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const dtf = new Intl.DateTimeFormat(localeTag, { dateStyle: "medium" });

  const { items, total, pageSize } = await listQuotes(ctx, { status, page });
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const canCreate = can(ctx.role, "quotes.create");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Devis</h1>
          <p className="text-sm text-muted-foreground">
            {total} devis · propositions commerciales
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/devis/nouveau">
              <Plus className="size-4" />
              Nouveau devis
            </Link>
          </Button>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href={`/devis`}
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium",
            !status ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          Tous
        </Link>
        {QUOTE_STATUSES.map((s) => (
          <Link
            key={s.value}
            href={`/devis${query({ status: s.value })}`}
            className={cn(
              "rounded-full border px-3 py-1 text-xs font-medium",
              status === s.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {s.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted">
            <FileText className="size-6 text-muted-foreground" />
          </span>
          <p className="font-medium text-foreground">Aucun devis</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            {status ? "Aucun devis dans ce statut." : "Créez votre premier devis à partir d’un client et de vos services."}
          </p>
          {canCreate && !status ? (
            <Button asChild className="mt-2">
              <Link href="/devis/nouveau">
                <Plus className="size-4" />
                Nouveau devis
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
                  <th className="px-4 py-3 font-medium">Numéro</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Total TTC</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {items.map((q) => (
                  <tr key={q.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/devis/${q.id}`} className="font-medium text-foreground hover:text-accent">
                        {q.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{contactName(q.contact)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{dtf.format(q.issueDate)}</td>
                    <td className="px-4 py-3 font-medium text-foreground">
                      {formatCurrency(q.totalMinor, q.currency, localeTag)}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={quoteStatusVariant(q.status)}>{quoteStatusLabel(q.status)}</Badge>
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
          <p className="text-sm text-muted-foreground">Page {page} sur {totalPages}</p>
          <div className="flex gap-2">
            {page > 1 ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/devis${query({ status, page: String(page - 1) })}`}>Précédent</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>Précédent</Button>
            )}
            {page < totalPages ? (
              <Button asChild variant="outline" size="sm">
                <Link href={`/devis${query({ status, page: String(page + 1) })}`}>Suivant</Link>
              </Button>
            ) : (
              <Button variant="outline" size="sm" disabled>Suivant</Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
