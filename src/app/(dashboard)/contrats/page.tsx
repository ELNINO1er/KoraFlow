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
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Contrats" };

const VALID = new Set(CONTRACT_STATUSES.map((s) => s.value));

function contactName(c: { firstName: string; lastName: string | null; companyName: string | null }) {
  return c.companyName ?? `${c.firstName} ${c.lastName ?? ""}`.trim();
}

export default async function ContractsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const ctx = await requireAuthContext();
  const sp = await searchParams;
  const status =
    sp.status && VALID.has(sp.status as ContractStatus)
      ? (sp.status as ContractStatus)
      : undefined;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const localeTag = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const dtf = new Intl.DateTimeFormat(localeTag, { dateStyle: "medium" });

  const { items, total } = await listContracts(ctx, { status, page });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Contrats</h1>
        <p className="text-sm text-muted-foreground">
          {total} contrat{total > 1 ? "s" : ""} · générés depuis les devis acceptés
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/contrats"
          className={cn(
            "rounded-full border px-3 py-1 text-xs font-medium",
            !status ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          Tous
        </Link>
        {CONTRACT_STATUSES.map((s) => (
          <Link
            key={s.value}
            href={`/contrats?status=${s.value}`}
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
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
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
