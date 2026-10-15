import type { Metadata } from "next";
import Link from "next/link";
import { Plus, CalendarDays, Link2, Clock3, MailCheck } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { listTypes, listUpcoming } from "@/server/services/appointment-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Rendez-vous" };

export default async function AppointmentsPage() {
  const ctx = await requireAuthContext();
  const [types, upcoming] = await Promise.all([listTypes(ctx), listUpcoming(ctx)]);
  const canCreate = can(ctx.role, "appointments.create");
  const localeTag = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const dtf = new Intl.DateTimeFormat(localeTag, { dateStyle: "medium", timeStyle: "short", timeZone: ctx.organization.timezone });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Rendez-vous</h1>
          <p className="text-sm text-muted-foreground">Types de rendez-vous et réservations à venir</p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/rendez-vous/nouveau">
              <Plus className="size-4" />
              Nouveau type
            </Link>
          </Button>
        ) : null}
      </div>

      <Card className="border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle>Comment fonctionnent les rendez-vous ?</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div className="flex gap-3"><Link2 className="mt-0.5 size-5 shrink-0 text-accent" /><div><p className="font-medium text-foreground">1. Créez et partagez</p><p className="text-sm text-muted-foreground">Un type définit la durée, le délai minimum et son lien public.</p></div></div>
          <div className="flex gap-3"><Clock3 className="mt-0.5 size-5 shrink-0 text-accent" /><div><p className="font-medium text-foreground">2. Le client choisit</p><p className="text-sm text-muted-foreground">Alymero propose uniquement les créneaux libres selon vos disponibilités.</p></div></div>
          <div className="flex gap-3"><MailCheck className="mt-0.5 size-5 shrink-0 text-accent" /><div><p className="font-medium text-foreground">3. Confirmation</p><p className="text-sm text-muted-foreground">La réservation est enregistrée, le client reçoit un e-mail et votre équipe une notification.</p></div></div>
          <p className="text-xs text-muted-foreground md:col-span-3">Rôle : réduire les échanges manuels et éviter les doubles réservations. Fuseau actif : <strong>{ctx.organization.timezone}</strong>. La synchronisation Google/Outlook reste à venir.</p>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {types.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
              <span className="flex size-14 items-center justify-center rounded-full bg-muted">
                <CalendarDays className="size-6 text-muted-foreground" />
              </span>
              <p className="font-medium text-foreground">Aucun type de rendez-vous</p>
              <p className="max-w-sm text-sm text-muted-foreground">
                Créez un type (ex. « Appel de découverte ») puis partagez son lien public de réservation.
              </p>
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {types.map((t) => (
                <Link key={t.id} href={`/rendez-vous/${t.id}`}>
                  <Card className="h-full p-5 transition-colors hover:border-accent">
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-medium text-foreground">{t.name}</p>
                      {t.active ? <Badge variant="success">Actif</Badge> : <Badge variant="outline">Inactif</Badge>}
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">/rdv/{t.slug} · {t.durationMinutes} min</p>
                    <p className="mt-3 text-sm text-muted-foreground">{t._count.appointments} réservation{t._count.appointments > 1 ? "s" : ""}</p>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>

        <Card>
          <CardHeader><CardTitle>Prochains rendez-vous</CardTitle></CardHeader>
          <CardContent>
            {upcoming.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucun rendez-vous à venir.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {upcoming.map((a) => (
                  <li key={a.id} className="border-b border-border pb-2 last:border-0">
                    <p className="text-sm font-medium text-foreground">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{a.appointmentType.name} · {dtf.format(a.startAt)} ({ctx.organization.timezone})</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
