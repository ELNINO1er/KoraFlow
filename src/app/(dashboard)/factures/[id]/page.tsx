import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, FileDown } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { getInvoice } from "@/server/services/invoice-service";
import { formatCurrency } from "@/lib/formatting/currency";
import { invoiceStatusLabel, invoiceStatusVariant, paymentMethodLabel } from "@/lib/constants/invoices";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { SendInvoiceButton, InvoiceStatusControl, DeleteInvoiceButton } from "@/features/invoices/invoice-controls";
import { PaymentValidation } from "@/features/payments/payment-validation";

export const metadata: Metadata = { title: "Facture" };

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireAuthContext();
  const { id } = await params;
  const invoice = await getInvoice(ctx, id);
  if (!invoice) notFound();

  const localeTag = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const money = (m: number) => formatCurrency(m, invoice.currency, localeTag);
  const dtf = new Intl.DateTimeFormat(localeTag, { dateStyle: "medium" });
  const dtfp = new Intl.DateTimeFormat(localeTag, { dateStyle: "medium", timeStyle: "short" });
  const canUpdate = can(ctx.role, "invoices.update");
  const canDelete = can(ctx.role, "invoices.delete");
  const canValidatePayments = can(ctx.role, "payments.update");
  const appUrl = process.env.APP_URL ?? "";
  const payUrl = invoice.publicToken ? `${appUrl}/i/${invoice.publicToken}` : null;
  const clientName = invoice.contact.companyName ?? `${invoice.contact.firstName} ${invoice.contact.lastName ?? ""}`.trim();
  const remaining = invoice.totalMinor - invoice.paidMinor;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link href="/factures" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Retour aux factures
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-foreground">{invoice.number}</h1>
            <Badge variant={invoiceStatusVariant(invoice.status)}>{invoiceStatusLabel(invoice.status)}</Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <a href={`/api/factures/${invoice.id}/pdf`} target="_blank" rel="noopener noreferrer">
                <FileDown className="size-4" />
                PDF
              </a>
            </Button>
            {canUpdate ? <SendInvoiceButton id={invoice.id} hasEmail={Boolean(invoice.contact.email)} /> : null}
            {canUpdate ? <InvoiceStatusControl id={invoice.id} current={invoice.status} /> : null}
            {canDelete ? <DeleteInvoiceButton id={invoice.id} /> : null}
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {clientName} · émise le {dtf.format(invoice.issueDate)}
          {invoice.dueDate ? ` · échéance le ${dtf.format(invoice.dueDate)}` : ""}
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Lignes</CardTitle></CardHeader>
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
                  {invoice.items.map((it) => (
                    <tr key={it.id} className="border-b border-border last:border-0">
                      <td className="py-2 pr-2 text-foreground">{it.description}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground">{it.quantity}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground">{money(it.unitPriceMinor)}</td>
                      <td className="px-2 py-2 text-right text-muted-foreground">{it.taxRate} %</td>
                      <td className="py-2 pl-2 text-right font-medium text-foreground">{money(it.unitPriceMinor * it.quantity)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader><CardTitle>Totaux</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-2 text-sm">
              <Row label="Sous-total HT" value={money(invoice.subtotalMinor)} />
              {invoice.discountMinor > 0 ? <Row label="Remise" value={`− ${money(invoice.discountMinor)}`} /> : null}
              <Row label="TVA" value={money(invoice.taxMinor)} />
              <div className="my-1 border-t border-border" />
              <Row label="Total TTC" value={money(invoice.totalMinor)} strong />
              <Row label="Payé" value={money(invoice.paidMinor)} />
              <Row label="Reste à payer" value={money(remaining)} strong />
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Paiements</CardTitle></CardHeader>
            <CardContent>
              {invoice.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Aucun paiement. Le client pourra déclarer un paiement depuis son
                  portail (validation manuelle à venir).
                </p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {invoice.payments.map((p) => (
                    <li key={p.id} className="flex flex-col gap-2 border-b border-border pb-3 last:border-0 last:pb-0">
                      <div className="flex items-center justify-between text-sm">
                        <div>
                          <span className="text-foreground">{money(p.amountMinor)}</span>
                          <span className="text-muted-foreground"> · {paymentMethodLabel(p.method)}</span>
                          <p className="text-xs text-muted-foreground">
                            {p.declaredByClient ? "Déclaré par le client · " : ""}
                            {p.reference ? `Réf. ${p.reference} · ` : ""}
                            {dtfp.format(p.createdAt)}
                          </p>
                        </div>
                        <Badge variant={p.status === "CONFIRMED" ? "success" : p.status === "REJECTED" ? "danger" : "warning"}>
                          {p.status === "CONFIRMED" ? "Confirmé" : p.status === "REJECTED" ? "Rejeté" : "En attente"}
                        </Badge>
                      </div>
                      {p.status === "PENDING" && canValidatePayments ? (
                        <PaymentValidation id={p.id} />
                      ) : null}
                    </li>
                  ))}
                </ul>
              )}
              {payUrl && invoice.status !== "DRAFT" && invoice.status !== "CANCELED" ? (
                <div className="mt-3 rounded-lg bg-muted/40 px-3 py-2">
                  <p className="text-xs font-medium text-foreground">Lien de paiement client</p>
                  <code className="break-all text-xs text-muted-foreground">{payUrl}</code>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
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
