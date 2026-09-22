import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileDown, CheckCircle2, XCircle } from "lucide-react";
import {
  getQuoteByPublicToken,
  markQuoteViewedByToken,
} from "@/server/repositories/quote-repository";
import { formatCurrency } from "@/lib/formatting/currency";
import { quoteStatusLabel, quoteStatusVariant } from "@/lib/constants/quotes";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { QuoteResponse } from "@/features/quotes/quote-response";

export const metadata: Metadata = { title: "Votre devis" };

export default async function PublicQuotePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const quote = await getQuoteByPublicToken(token);
  if (!quote) notFound();

  // Premier affichage : marquer comme consulté.
  if (quote.status === "SENT") {
    await markQuoteViewedByToken(token);
  }
  const displayStatus = quote.status === "SENT" ? "VIEWED" : quote.status;
  const canRespond = displayStatus === "VIEWED";

  const localeTag = quote.organization.locale === "fr" ? "fr-FR" : quote.organization.locale;
  const money = (m: number) => formatCurrency(m, quote.currency, localeTag);
  const dtf = new Intl.DateTimeFormat(localeTag, { dateStyle: "medium" });
  const clientName = quote.contact.companyName
    ? quote.contact.companyName
    : `${quote.contact.firstName} ${quote.contact.lastName ?? ""}`.trim();
  const remaining = quote.totalMinor - quote.depositMinor;

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-display text-xl font-bold text-primary">
            {quote.organization.name}
          </span>
          <p className="text-xs text-muted-foreground">via KoraFlow</p>
        </div>
        <Badge variant={quoteStatusVariant(displayStatus)}>
          {quoteStatusLabel(displayStatus)}
        </Badge>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl">Devis {quote.number}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Adressé à {clientName} · émis le {dtf.format(quote.issueDate)}
              {quote.expiryDate ? ` · valable jusqu’au ${dtf.format(quote.expiryDate)}` : ""}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/q/${token}/pdf`} target="_blank" rel="noopener noreferrer">
              <FileDown className="size-4" />
              PDF
            </a>
          </Button>
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

          <div className="mt-4 flex flex-col gap-1 text-sm sm:ml-auto sm:w-64">
            <Row label="Sous-total HT" value={money(quote.subtotalMinor)} />
            {quote.discountMinor > 0 ? <Row label="Remise" value={`− ${money(quote.discountMinor)}`} /> : null}
            <Row label="TVA" value={money(quote.taxMinor)} />
            <div className="my-1 border-t border-border" />
            <Row label="Total TTC" value={money(quote.totalMinor)} strong />
            {quote.depositMinor > 0 ? (
              <>
                <Row label="Acompte" value={money(quote.depositMinor)} />
                <Row label="Reste à payer" value={money(remaining)} />
              </>
            ) : null}
          </div>

          {quote.notes ? <p className="mt-4 text-sm text-muted-foreground">{quote.notes}</p> : null}
        </CardContent>
      </Card>

      {canRespond ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5">
            <p className="text-sm text-muted-foreground">
              Merci de nous indiquer votre décision concernant ce devis.
            </p>
            <QuoteResponse token={token} />
          </CardContent>
        </Card>
      ) : displayStatus === "ACCEPTED" ? (
        <div className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-3 text-success">
          <CheckCircle2 className="size-5" />
          <span className="text-sm font-medium">Vous avez accepté ce devis. Merci !</span>
        </div>
      ) : displayStatus === "REJECTED" ? (
        <div className="flex items-center gap-2 rounded-lg bg-danger/10 px-4 py-3 text-danger">
          <XCircle className="size-5" />
          <span className="text-sm font-medium">Vous avez refusé ce devis.</span>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Ce devis n’est pas en attente de réponse.
        </p>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Document non contractuel tant qu’il n’est pas accepté.
      </p>
    </main>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-display text-base font-bold text-foreground" : "text-foreground"}>
        {value}
      </span>
    </div>
  );
}
