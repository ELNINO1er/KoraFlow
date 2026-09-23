import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FileText, ScrollText, ReceiptText, FolderKanban, CalendarDays } from "lucide-react";
import { getContactByPortalToken } from "@/server/repositories/contact-repository";
import { formatCurrency } from "@/lib/formatting/currency";
import { quoteStatusLabel, quoteStatusVariant } from "@/lib/constants/quotes";
import { contractStatusLabel, contractStatusVariant } from "@/lib/constants/contracts";
import { invoiceStatusLabel, invoiceStatusVariant } from "@/lib/constants/invoices";
import { projectStatusLabel, projectStatusVariant } from "@/lib/constants/projects";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Espace client" };

export default async function ClientPortalPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const contact = await getContactByPortalToken(token);
  if (!contact) notFound();

  const localeTag = contact.organization.locale === "fr" ? "fr-FR" : contact.organization.locale;
  const money = (m: number, c: string) => formatCurrency(m, c, localeTag);
  const dtf = new Intl.DateTimeFormat(localeTag, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" });
  const clientName = contact.companyName ?? `${contact.firstName} ${contact.lastName ?? ""}`.trim();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div>
        <span className="font-display text-xl font-bold text-primary">{contact.organization.name}</span>
        <p className="text-xs text-muted-foreground">Espace client · {clientName}</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="size-4" /> Devis</CardTitle></CardHeader>
        <CardContent>
          {contact.quotes.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun devis.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {contact.quotes.map((q) => (
                <li key={q.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <a href={`/q/${q.publicToken}`} className="text-sm font-medium text-foreground hover:text-accent">{q.number}</a>
                  <span className="text-sm text-muted-foreground">{money(q.totalMinor, q.currency)}</span>
                  <Badge variant={quoteStatusVariant(q.status)}>{quoteStatusLabel(q.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ScrollText className="size-4" /> Contrats</CardTitle></CardHeader>
        <CardContent>
          {contact.contracts.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun contrat.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {contact.contracts.map((c) => (
                <li key={c.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <a href={`/c/${c.publicToken}`} className="text-sm font-medium text-foreground hover:text-accent">{c.number}</a>
                  <span className="truncate text-sm text-muted-foreground">{c.title}</span>
                  <Badge variant={contractStatusVariant(c.status)}>{contractStatusLabel(c.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><ReceiptText className="size-4" /> Factures</CardTitle></CardHeader>
        <CardContent>
          {contact.invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune facture.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {contact.invoices.map((inv) => (
                <li key={inv.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <a href={`/i/${inv.publicToken}`} className="text-sm font-medium text-foreground hover:text-accent">{inv.number}</a>
                  <span className="text-sm text-muted-foreground">{money(inv.totalMinor, inv.currency)}</span>
                  <Badge variant={invoiceStatusVariant(inv.status)}>{invoiceStatusLabel(inv.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="flex items-center gap-2"><FolderKanban className="size-4" /> Projets</CardTitle></CardHeader>
        <CardContent>
          {contact.projects.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun projet.</p>
          ) : (
            <ul className="flex flex-col divide-y divide-border">
              {contact.projects.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <span className="text-sm font-medium text-foreground">{p.title}</span>
                  <span className="text-xs text-muted-foreground">{p.progress}%</span>
                  <Badge variant={projectStatusVariant(p.status)}>{projectStatusLabel(p.status)}</Badge>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {contact.appointments.length > 0 ? (
        <Card>
          <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays className="size-4" /> Rendez-vous</CardTitle></CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {contact.appointments.map((a) => (
                <li key={a.id} className="flex items-center justify-between gap-3 py-2 first:pt-0 last:pb-0">
                  <span className="text-sm text-foreground">{a.appointmentType.name}</span>
                  <span className="text-xs text-muted-foreground">{dtf.format(a.startAt)} (UTC)</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}

      <p className="text-center text-xs text-muted-foreground">
        Espace fourni par {contact.organization.name} via KoraFlow.
      </p>
    </main>
  );
}
