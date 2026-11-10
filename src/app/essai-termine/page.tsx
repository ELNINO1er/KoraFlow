import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Hourglass } from "lucide-react";
import { resolveSession } from "@/server/auth/context";
import { listUserOrganizations } from "@/server/services/organization-service";
import { DateText } from "@/components/ui/date-text";
import { TrialExpiredActions } from "@/features/billing/trial-expired-actions";

import { startSubscription } from "@/features/billing/subscription-action";
import { checkoutConfigured, subscriptionMethods } from "@/server/services/subscription-checkout";

export const metadata: Metadata = { title: "Renouveler votre accès" };

const methodNames = { wave: "Wave", orange: "Orange Money", mtn: "MTN MoMo", moov: "Moov Money", djamo: "Djamo", jeko: "Jèko" };

export default async function TrialExpiredPage({ searchParams }: {
  searchParams: Promise<{ paiement?: string }>;
}) {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "suspended") redirect("/compte-suspendu");
  if (session.status === "no-organization") redirect("/create-organization");
  if (session.status === "ok") redirect("/dashboard");

  const { paiement } = await searchParams;
  const subscriptionEnd = session.organization.subscriptionEndsAt;
  const now = new Date();
  const memberships = await listUserOrganizations(session.user.id);
  const others = memberships
    .filter(
      (m) =>
        m.organizationId !== session.organization.id &&
        !m.organization.suspendedAt &&
        !m.organization.deletedAt &&
        (!m.organization.trialEndsAt || m.organization.trialEndsAt > now ||
          (m.organization.subscriptionEndsAt && m.organization.subscriptionEndsAt > now)),
    )
    .map((m) => ({ id: m.organization.id, name: m.organization.name }));

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-warning/20 text-warning-foreground">
          <Hourglass className="size-6" />
        </div>
        <h1 className="font-display text-xl font-bold text-foreground">{subscriptionEnd ? "Votre abonnement est arrivé à échéance" : "Votre essai gratuit est terminé"}</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          {subscriptionEnd ? "L’abonnement" : "La période d’essai"} de <strong className="text-foreground">{session.organization.name}</strong> a pris
          fin le <DateText value={subscriptionEnd ?? session.organization.trialEndsAt} variant="datetime" />. L&apos;accès à
          l&apos;espace de travail est suspendu, mais <strong className="text-foreground">aucune donnée n&apos;est
          supprimée</strong> et les liens envoyés à vos clients (devis, factures, contrats, portail) restent
          accessibles.
        </p>
        {paiement === "confirmation" ? (
          <p role="status" className="mt-3 text-sm">Confirmation Jèko en cours. Actualisez cette page dans quelques instants.</p>
        ) : null}
        {paiement === "echec" || paiement === "indisponible" ? (
          <p role="status" className="mt-3 text-sm">Le paiement n’a pas encore été confirmé. Vous pouvez réessayer dans un instant.</p>
        ) : null}
        {session.canPay && checkoutConfigured() ? (
          <form action={startSubscription} className="mt-5 flex flex-col gap-2">
            <label htmlFor="payment-method" className="text-sm font-medium">Moyen de paiement</label>
            <select id="payment-method" name="method" className="rounded-lg border border-border bg-surface p-2">
              {subscriptionMethods.map((method) => (
                <option key={method} value={method}>{methodNames[method]}</option>
              ))}
            </select>
            <button className="rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              Renouveler · 10 000 F CFA pour un mois
            </button>
          </form>
        ) : (
          <p className="mt-3 text-sm text-muted-foreground">
            {session.canPay ? "Contactez l’équipe Alymero pour renouveler votre accès." : "Le propriétaire de l’organisation peut renouveler l’accès."}
          </p>
        )}
        <TrialExpiredActions organizations={others} />
      </div>
    </div>
  );
}
