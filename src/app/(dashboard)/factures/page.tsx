import type { Metadata } from "next";
import Link from "next/link";
import { ReceiptText } from "lucide-react";
import type { InvoiceStatus } from "@prisma/client";
import { requireAuthContext } from "@/server/auth/context";
import { listInvoices } from "@/server/services/invoice-service";
import { formatCurrency } from "@/lib/formatting/currency";
import { INVOICE_STATUSES, invoiceStatusLabel, invoiceStatusVariant } from "@/lib/constants/invoices";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Factures" };

const VALID = new Set(INVOICE_STATUSES.map((s) => s.value));

function contactName(c: { firstName: string; lastName: string | null; companyName: string | null }) {
  return c.companyName ?? `${c.firstName} ${c.lastName ?? ""}`.trim();
}

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; page?: string }>;
}) {
  const ctx = await requireAuthContext();
  const sp = await searchParams;
  const status = sp.status && VALID.has(sp.status as InvoiceStatus) ? (sp.status as InvoiceStatus) : undefined;
  const page = Math.max(1, Number(sp.page ?? "1") || 1);
  const localeTag = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const dtf = new Intl.DateTimeFormat(localeTag, { dateStyle: "medium" });

  const { items, total } = await listInvoices(ctx, { status, page });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Factures</h1>
        <p className="text-sm text-muted-foreground">
          {total} facture{total > 1 ? "s" : ""} · générées depuis les devis acceptés
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/factures" className={cn("rounded-full border px-3 py-1 text-xs font-medium", !status ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted")}>
          Toutes
        </Link>
        {INVOICE_STATUSES.map((s) => (
          <Link key={s.value} href={`/factures?status=${s.value}`} className={cn("rounded-full border px-3 py-1 text-xs font-medium", status === s.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted")}>
            {s.label}
          </Link>
        ))}
      </div>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted">
            <ReceiptText className="size-6 text-muted-foreground" />
          </span>
          <p className="font-medium text-foreground">Aucune facture</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Les factures se génèrent depuis un devis accepté (bouton « Générer la facture »).
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
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Échéance</th>
                  <th className="px-4 py-3 font-medium">Total TTC</th>
                  <th className="px-4 py-3 font-medium">Payé</th>
                  <th className="px-4 py-3 font-medium">Statut</th>
                </tr>
              </thead>
              <tbody>
                {items.map((inv) => (
                  <tr key={inv.id} className="border-b border-border last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link href={`/factures/${inv.id}`} className="font-medium text-foreground hover:text-accent">
                        {inv.number}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-muted-foreground">{contactName(inv.contact)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{inv.dueDate ? dtf.format(inv.dueDate) : "—"}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{formatCurrency(inv.totalMinor, inv.currency, localeTag)}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatCurrency(inv.paidMinor, inv.currency, localeTag)}</td>
                    <td className="px-4 py-3">
                      <Badge variant={invoiceStatusVariant(inv.status)}>{invoiceStatusLabel(inv.status)}</Badge>
                    </td>
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
