import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { getQuote } from "@/server/services/quote-service";
import { formatCurrency } from "@/lib/formatting/currency";
import { quoteStatusLabel, quoteStatusVariant } from "@/lib/constants/quotes";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { QuoteStatusControl, QuoteDeleteButton } from "@/features/quotes/quote-controls";
import { SendQuoteButton } from "@/features/quotes/send-quote-button";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Devis" };

export default async function QuoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireAuthContext();
  const { id } = await params;
  const quote = await getQuote(ctx, id);
  if (!quote) notFound();

  const localeTag = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const money = (m: number) => formatCurrency(m, quote.currency, localeTag);
  const dtf = new Intl.DateTimeFormat(localeTag, { dateStyle: "medium" });
  const canUpdate = can(ctx.role, "quotes.update");
  const canDelete = can(ctx.role, "quotes.delete");
  const clientName = quote.contact.companyName
    ? quote.contact.companyName
    : `${quote.contact.firstName} ${quote.contact.lastName ?? ""}`.trim();
  const remaining = quote.totalMinor - quote.depositMinor;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link
          href="/devis"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour aux devis
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {quote.number}
            </h1>
            <Badge variant={quoteStatusVariant(quote.status)}>
              {quoteStatusLabel(quote.status)}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/devis/${quote.id}/pdf`} target="_blank" rel="noopener noreferrer">
                <FileDown className="size-4" />
                PDF
              </a>
            </Button>
            {canUpdate ? (
              <SendQuoteButton id={quote.id} hasEmail={Boolean(quote.contact.email)} />
            ) : null}
            {canUpdate ? <QuoteStatusControl id={quote.id} current={quote.status} /> : null}
            {canDelete ? <QuoteDeleteButton id={quote.id} /> : null}
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {clientName} · émis le {dtf.format(quote.issueDate)}
          {quote.expiryDate ? ` · expire le ${dtf.format(quote.expiryDate)}` : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Lignes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-muted-foreground">
                    <th className="py-2 pr-2 font-medium">Description</th>
                    <th className="px-2 py-2 text-right font-medium">Qté</th>
                    <th className="px-2 py-2 text-right font-medium">P.U. HT</th>
                    <th className="px-2 py-2 text-right font-medium">TVA</th>
                    <th className="py-2 pl-2 text-right font-medium">Total HT</th>
                  </tr>
                </thead>
                <tbody>
                  {quote.items.map((it) => (
                    <tr key={it.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-2 text-foreground">{it.description}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground">{it.quantity}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground">{money(it.unitPriceMinor)}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground">{it.taxRate} %</td>
                      <td className="py-2 pl-2 text-right font-medium text-foreground">
                        {money(it.unitPriceMinor * it.quantity)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {quote.notes ? (
              <p className="mt-4 text-sm text-muted-foreground">{quote.notes}</p>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Totaux</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Sous-total HT" value={money(quote.subtotalMinor)} />
            {quote.discountMinor > 0 ? (
              <Row label="Remise" value={`− ${money(quote.discountMinor)}`} />
            ) : null}
            <Row label="TVA" value={money(quote.taxMinor)} />
            <div className="my-1 border-t border-border" />
            <Row label="Total TTC" value={money(quote.totalMinor)} strong />
            {quote.depositMinor > 0 ? (
              <>
                <Row label="Acompte" value={money(quote.depositMinor)} />
                <Row label="Reste à payer" value={money(remaining)} />
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-display text-base font-bold text-foreground" : "text-foreground"}>
        {value}
      </span>
    </div>
  );
}
