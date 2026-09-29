import type { Metadata } from "next";
import { notFound } from "next/navigation";
import {
  FileText,
  ScrollText,
  ReceiptText,
  FolderKanban,
  PackageCheck,
  CalendarDays,
  Check,
  ArrowRight,
  CircleDot,
} from "lucide-react";
import { getContactByPortalToken } from "@/server/repositories/contact-repository";
import { formatCurrency } from "@/lib/formatting/currency";
import { quoteStatusLabel, quoteStatusVariant } from "@/lib/constants/quotes";
import { contractStatusLabel, contractStatusVariant } from "@/lib/constants/contracts";
import { invoiceStatusLabel, invoiceStatusVariant } from "@/lib/constants/invoices";
import { projectStatusLabel, projectStatusVariant } from "@/lib/constants/projects";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Mon parcours" };

type StageState = "done" | "action" | "current" | "upcoming";

const STAGE_STYLES: Record<StageState, { badge: string; label: string; ring: string }> = {
  done: { badge: "bg-success/15 text-success", label: "Terminé", ring: "border-success/40" },
  action: { badge: "bg-accent text-accent-foreground", label: "Action requise", ring: "border-accent" },
  current: { badge: "bg-primary/10 text-primary", label: "En cours", ring: "border-primary/30" },
  upcoming: { badge: "bg-muted text-muted-foreground", label: "À venir", ring: "border-border" },
};

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

  // --- Dérivation de l'état de chaque étape à partir des données réelles ---
  const quotes = contact.quotes;
  const contracts = contact.contracts;
  const invoices = contact.invoices;
  const projects = contact.projects;

  const quoteToAnswer = quotes.find((q) => q.status === "SENT" || q.status === "VIEWED");
  const devisState: StageState = quotes.some((q) => q.status === "ACCEPTED")
    ? "done"
    : quoteToAnswer
      ? "action"
      : quotes.length > 0
        ? "current"
        : "upcoming";

  const contractToSign = contracts.find((c) => c.status === "SENT");
  const contratState: StageState = contracts.some((c) => c.status === "SIGNED")
    ? "done"
    : contractToSign
      ? "action"
      : contracts.length > 0
        ? "current"
        : "upcoming";

  const relevantInvoices = invoices.filter((i) => i.status !== "DRAFT" && i.status !== "CANCELED");
  const invoiceToPay = relevantInvoices.find(
    (i) => i.status === "SENT" || i.status === "PARTIALLY_PAID" || i.status === "OVERDUE",
  );
  const paiementState: StageState =
    relevantInvoices.length === 0
      ? "upcoming"
      : relevantInvoices.every((i) => i.status === "PAID")
        ? "done"
        : invoiceToPay
          ? "action"
          : "current";

  const allProjectsDone = projects.length > 0 && projects.every((p) => p.status === "COMPLETED");
  const projetState: StageState =
    projects.length === 0 ? "upcoming" : allProjectsDone ? "done" : "current";
  const livraisonState: StageState = allProjectsDone ? "done" : projects.length > 0 ? "current" : "upcoming";

  const stages = [
    { key: "devis", label: "Devis", icon: FileText, state: devisState },
    { key: "contrat", label: "Contrat", icon: ScrollText, state: contratState },
    { key: "paiement", label: "Paiement", icon: ReceiptText, state: paiementState },
    { key: "projet", label: "Projet", icon: FolderKanban, state: projetState },
    { key: "livraison", label: "Livraison", icon: PackageCheck, state: livraisonState },
  ];

  // --- Ce qui requiert l'action du client, maintenant ---
  const todos: { label: string; href: string }[] = [];
  if (quoteToAnswer) todos.push({ label: `Consulter et répondre au devis ${quoteToAnswer.number}`, href: `/q/${quoteToAnswer.publicToken}` });
  if (contractToSign) todos.push({ label: `Signer le contrat ${contractToSign.number}`, href: `/c/${contractToSign.publicToken}` });
  if (invoiceToPay) todos.push({ label: `Régler la facture ${invoiceToPay.number}`, href: `/i/${invoiceToPay.publicToken}` });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <header className="app-enter">
        <span className="font-display text-xl font-bold text-foreground">
          {contact.organization.name}
        </span>
        <h1 className="mt-3 font-display text-2xl font-bold tracking-tight text-foreground">
          Bonjour {contact.firstName}
        </h1>
        <p className="text-sm text-muted-foreground">
          Voici où en est votre projet avec {contact.organization.name}.
        </p>
      </header>

      {/* À faire maintenant */}
      <section className="app-enter" style={{ animationDelay: "60ms" }}>
        {todos.length > 0 ? (
          <Card className="border-accent/40">
            <CardHeader>
              <CardTitle className="text-base">À faire de votre côté</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              {todos.map((t) => (
                <a
                  key={t.href}
                  href={t.href}
                  className="group flex items-center justify-between gap-3 rounded-lg border border-accent/30 bg-accent/5 px-4 py-3 text-sm font-medium text-foreground transition-colors hover:bg-accent/10"
                >
                  {t.label}
                  <ArrowRight className="size-4 shrink-0 text-accent transition-transform group-hover:translate-x-0.5" />
                </a>
              ))}
            </CardContent>
          </Card>
        ) : (
          <Card>
            <CardContent className="flex items-center gap-3 py-4">
              <span className="flex size-9 items-center justify-center rounded-full bg-success/15 text-success">
                <Check className="size-5" />
              </span>
              <p className="text-sm text-foreground">
                Tout est à jour de votre côté. Rien à faire pour l&apos;instant.
              </p>
            </CardContent>
          </Card>
        )}
      </section>

      {/* Mon parcours */}
      <section className="app-enter" style={{ animationDelay: "120ms" }}>
        <h2 className="mb-3 font-display text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Mon parcours
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-5">
          {stages.map((s) => {
            const style = STAGE_STYLES[s.state];
            const Icon = s.state === "done" ? Check : s.icon;
            return (
              <div
                key={s.key}
                className={cn(
                  "flex items-center gap-3 rounded-xl border bg-surface p-3 sm:flex-col sm:items-start sm:gap-2",
                  style.ring,
                )}
              >
                <span
                  className={cn(
                    "flex size-9 shrink-0 items-center justify-center rounded-full",
                    style.badge,
                    s.state === "action" ? "animate-pulse" : "",
                  )}
                >
                  <Icon className="size-4" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{s.label}</p>
                  <p className="text-xs text-muted-foreground">{style.label}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Détails */}
      <PortalSection icon={FileText} title="Devis" empty={quotes.length === 0} emptyText="Aucun devis pour l'instant.">
        {quotes.map((q) => (
          <PortalRow
            key={q.id}
            href={`/q/${q.publicToken}`}
            title={q.number}
            meta={money(q.totalMinor, q.currency)}
            badge={<Badge variant={quoteStatusVariant(q.status)}>{quoteStatusLabel(q.status)}</Badge>}
            actionText={q.status === "SENT" || q.status === "VIEWED" ? "Consulter et répondre" : undefined}
          />
        ))}
      </PortalSection>

      <PortalSection icon={ScrollText} title="Contrats" empty={contracts.length === 0} emptyText="Aucun contrat pour l'instant.">
        {contracts.map((c) => (
          <PortalRow
            key={c.id}
            href={`/c/${c.publicToken}`}
            title={c.number}
            meta={c.title}
            badge={<Badge variant={contractStatusVariant(c.status)}>{contractStatusLabel(c.status)}</Badge>}
            actionText={c.status === "SENT" ? "Signer" : undefined}
          />
        ))}
      </PortalSection>

      <PortalSection icon={ReceiptText} title="Factures" empty={invoices.length === 0} emptyText="Aucune facture pour l'instant.">
        {invoices.map((inv) => (
          <PortalRow
            key={inv.id}
            href={`/i/${inv.publicToken}`}
            title={inv.number}
            meta={money(inv.totalMinor, inv.currency)}
            badge={<Badge variant={invoiceStatusVariant(inv.status)}>{invoiceStatusLabel(inv.status)}</Badge>}
            actionText={
              inv.status === "SENT" || inv.status === "PARTIALLY_PAID" || inv.status === "OVERDUE"
                ? "Régler / déclarer un paiement"
                : undefined
            }
          />
        ))}
      </PortalSection>

      {projects.length > 0 ? (
        <PortalSection icon={FolderKanban} title="Projets" empty={false} emptyText="">
          {projects.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{p.title}</p>
                <div className="mt-1.5 h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full bg-success" style={{ width: `${p.progress}%` }} />
                </div>
              </div>
              <Badge variant={projectStatusVariant(p.status)}>{projectStatusLabel(p.status)}</Badge>
            </div>
          ))}
        </PortalSection>
      ) : null}

      {contact.appointments.length > 0 ? (
        <PortalSection icon={CalendarDays} title="Rendez-vous" empty={false} emptyText="">
          {contact.appointments.map((a) => (
            <div key={a.id} className="flex items-center justify-between gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="text-sm text-foreground">{a.appointmentType.name}</span>
              <span className="text-xs text-muted-foreground">{dtf.format(a.startAt)} (UTC)</span>
            </div>
          ))}
        </PortalSection>
      ) : null}

      <p className="pt-2 text-center text-xs text-muted-foreground">
        Espace fourni par {contact.organization.name} via KoraFlow.
      </p>
    </main>
  );
}

function PortalSection({
  icon: Icon,
  title,
  empty,
  emptyText,
  children,
}: {
  icon: typeof FileText;
  title: string;
  empty: boolean;
  emptyText: string;
  children: React.ReactNode;
}) {
  return (
    <Card className="app-enter">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Icon className="size-4 text-accent" /> {title}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {empty ? (
          <p className="text-sm text-muted-foreground">{emptyText}</p>
        ) : (
          <div className="flex flex-col divide-y divide-border">{children}</div>
        )}
      </CardContent>
    </Card>
  );
}

function PortalRow({
  href,
  title,
  meta,
  badge,
  actionText,
}: {
  href: string;
  title: string;
  meta: string;
  badge: React.ReactNode;
  actionText?: string;
}) {
  return (
    <a
      href={href}
      className="group flex items-center gap-3 py-3 first:pt-0 last:pb-0"
    >
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium text-foreground group-hover:text-accent">
          {title}
          <ArrowRight className="size-3.5 opacity-0 transition-opacity group-hover:opacity-100" />
        </p>
        {actionText ? (
          <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-accent">
            <CircleDot className="size-3" /> {actionText}
          </p>
        ) : (
          <p className="truncate text-xs text-muted-foreground">{meta}</p>
        )}
      </div>
      {actionText ? <span className="text-xs text-muted-foreground">{meta}</span> : null}
      {badge}
    </a>
  );
}
