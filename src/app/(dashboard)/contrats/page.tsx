import type { Metadata } from "next";
import Link from "next/link";
import { ScrollText } from "lucide-react";
import type { ContractStatus } from "@prisma/client";
import { requireAuthContext } from "@/server/auth/context";
import { listContracts } from "@/server/services/contract-service";
import {
  CONTRACT_STATUSES,
  contractStatusLabel,
  contractStatusVariant,
} from "@/lib/constants/contracts";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ListSearch } from "@/components/app/list-search";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Contrats" };

const VALID = new Set(CONTRACT_STATUSES.map((s) => s.value));

function contactName(c: { firstName: string; lastName: string | null; companyName: string | null }) {
  return c.companyName ?? `${c.firstName} ${c.lastName ?? ""}`.trim();
}

function query(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; page?: string }>;
}) {
  const ctx = await requireAuthContext();
  const sp = await searchParams;
  const status =
    sp.status && VALID.has(sp.status as ContractStatus)
      ? (sp.status as ContractStatus)
      : undefined;
  const q = sp.q?.trim() || undefined;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const localeTag = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const dtf = new Intl.DateTimeFormat(localeTag, { dateStyle: "medium" });

  const { items, total } = await listContracts(ctx, { status, search: q, page });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight text-foreground">Contrats</h1>
        <p className="text-sm text-muted-foreground">
          {total} contrat{total > 1 ? "s" : ""} · générés depuis les devis acceptés
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <ListSearch placeholder="Rechercher un contrat (n°)…" />
        <div className="flex w-fit max-w-full flex-wrap gap-1 rounded-xl bg-surface p-1 shadow-e1 ring-1 ring-border/60">
          <Link
            href={`/contrats${query({ q })}`}
            className={cn(
              "rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors",
              !status ? "bg-primary font-semibold text-primary-foreground shadow-e1" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            Tous
          </Link>
          {CONTRACT_STATUSES.map((s) => (
            <Link
              key={s.value}
              href={`/contrats${query({ q, status: s.value })}`}
              className={cn(
                "rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors",
                status === s.value ? "bg-primary font-semibold text-primary-foreground shadow-e1" : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted">
            <ScrollText className="size-6 text-muted-foreground" />
          </span>
          <p className="font-medium text-foreground">Aucun contrat</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Les contrats se génèrent depuis un devis accepté (bouton « Générer le contrat »).
          </p>
          <Button asChild variant="outline" className="mt-2">
            <Link href="/devis">Voir les devis</Link>
          </Button>
        </Card>
      ) : (
        <Card className="overflow-hidden">
          <div className="overflow-x-auto p-2">
            <table className="kf-table text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3 font-medium">Numéro</th>
                  <th className="px-4 py-3 font-medium">Titre</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {items.map((c) => (
                  <tr key={c.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/contrats/${c.id}`} className="font-medium text-foreground hover:text-accent">
                        {c.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{c.title}</td>
                    <td className="px-4 py-3 text-muted-foreground">{contactName(c.contact)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={contractStatusVariant(c.status)}>{contractStatusLabel(c.status)}</Badge>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{dtf.format(c.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
