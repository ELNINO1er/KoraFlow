import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileDown, CheckCircle2 } from "lucide-react";
import { getInvoiceByToken } from "@/server/repositories/invoice-repository";
import { formatCurrency, minorUnitsFor } from "@/lib/formatting/currency";
import { invoiceStatusLabel, invoiceStatusVariant, paymentMethodLabel } from "@/lib/constants/invoices";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DeclarePaymentForm } from "@/features/payments/declare-payment-form";

export const metadata: Metadata = { title: "Votre facture" };

export default async function PublicInvoicePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const invoice = await getInvoiceByToken(token);
  if (!invoice) notFound();

  const localeTag = invoice.organization.locale === "fr" ? "fr-FR" : invoice.organization.locale;
  const money = (m: number) => formatCurrency(m, invoice.currency, localeTag);
  const dtf = new Intl.DateTimeFormat(localeTag, { dateStyle: "medium" });
  const clientName = invoice.contact.companyName
    ? invoice.contact.companyName
    : `${invoice.contact.firstName} ${invoice.contact.lastName ?? ""}`.trim();
  const remaining = invoice.totalMinor - invoice.paidMinor;
  const canPay =
    remaining > 0 &&
    (invoice.status === "SENT" || invoice.status === "PARTIALLY_PAID" || invoice.status === "OVERDUE");

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <span className="font-display text-xl font-bold text-primary">{invoice.organization.name}</span>
          <p className="text-xs text-muted-foreground">via KoraFlow</p>
        </div>
        <Badge variant={invoiceStatusVariant(invoice.status)}>{invoiceStatusLabel(invoice.status)}</Badge>
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl">Facture {invoice.number}</CardTitle>
            <p className="text-sm text-muted-foreground">
              Adressée à {clientName} · émise le {dtf.format(invoice.issueDate)}
              {invoice.dueDate ? ` · échéance le ${dtf.format(invoice.dueDate)}` : ""}
            </p>
          </div>
          <Button asChild variant="outline" size="sm">
            <a href={`/api/i/${token}/pdf`} target="_blank" rel="noopener noreferrer">
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
                  <th className="py-2 pl-2 text-right font-medium">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((it) => (
                  <tr key={it.id} className="border-b border-border last:border-0">
                    <td className="py-2 pr-2 text-foreground">{it.description}</td>
                    <td className="px-2 py-2 text-right text-muted-foreground">{it.quantity}</td>
                    <td className="px-2 py-2 text-right text-muted-foreground">{money(it.unitPriceMinor)}</td>
                    <td className="py-2 pl-2 text-right font-medium text-foreground">{money(it.unitPriceMinor * it.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex flex-col gap-1 text-sm sm:ml-auto sm:w-64">
            <Row label="Total TTC" value={money(invoice.totalMinor)} strong />
            <Row label="Déjà payé" value={money(invoice.paidMinor)} />
            <Row label="Reste à payer" value={money(remaining)} strong />
          </div>
        </CardContent>
      </Card>

      {canPay ? (
        <Card>
          <CardHeader>
            <CardTitle>Déclarer un paiement</CardTitle>
            <p className="text-sm text-muted-foreground">
              Après votre paiement (Wave, Orange Money, MTN, virement…), déclarez-le
              ici. Le prestataire le validera après vérification.
            </p>
          </CardHeader>
          <CardContent>
            <DeclarePaymentForm
              token={token}
              currency={invoice.currency}
              minorUnits={minorUnitsFor(invoice.currency)}
              suggestedMajor={remaining / 10 ** minorUnitsFor(invoice.currency)}
            />
          </CardContent>
        </Card>
      ) : invoice.status === "PAID" ? (
        <div className="flex items-center gap-2 rounded-lg bg-success/10 px-4 py-3 text-success">
          <CheckCircle2 className="size-5" />
          <span className="text-sm font-medium">Cette facture est intégralement payée. Merci !</span>
        </div>
      ) : null}

      {invoice.payments.length > 0 ? (
        <Card>
          <CardHeader><CardTitle>Paiements confirmés</CardTitle></CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              {invoice.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between">
                  <span className="text-foreground">
                    {money(p.amountMinor)} · {paymentMethodLabel(p.method)}
                  </span>
                  <span className="text-xs text-muted-foreground">{dtf.format(p.createdAt)}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        La confirmation d’un paiement est effectuée manuellement par le prestataire.
      </p>
    </main>
  );
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-display text-base font-bold text-foreground" : "text-foreground"}>{value}</span>
    </div>
  );
}
