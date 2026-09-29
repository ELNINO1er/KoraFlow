"use client";

import { useState, useTransition } from "react";
import { Loader2, CheckCircle2, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Reveal, SectionHeading } from "./reveal";
import { joinWaitlist } from "./waitlist-actions";

const PERKS = [
  "Testez la plateforme en avant-première",
  "Influencez les prochaines fonctionnalités",
  "Accompagnement pour la mise en route",
];

export function WaitlistSection() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const form = e.currentTarget;
    const data = new FormData(form);
    const input = {
      firstName: String(data.get("firstName") ?? ""),
      email: String(data.get("email") ?? ""),
      activity: String(data.get("activity") ?? ""),
      country: String(data.get("country") ?? ""),
    };
    startTransition(async () => {
      const r = await joinWaitlist(input);
      if (!r.ok) {
        setError(r.error ?? "Une erreur est survenue.");
        return;
      }
      form.reset();
      setDone(true);
    });
  }

  return (
    <section id="tarifs" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <Reveal variant="right">
          <div>
            <SectionHeading
              align="left"
              kicker="Bientôt disponible"
              title="Participez aux premières versions de KoraFlow"
              subtitle="Les tarifs seront annoncés au lancement. En attendant, rejoignez la liste d'attente : les premiers inscrits testent et façonnent la plateforme."
            />
            <ul className="mt-6 space-y-3">
              {PERKS.map((p) => (
                <li key={p} className="flex items-start gap-3 text-sm text-foreground">
                  <Sparkles className="mt-0.5 size-5 shrink-0 text-accent" />
                  <span>{p}</span>
                </li>
              ))}
            </ul>
          </div>
        </Reveal>

        <Reveal variant="left" amount={0.2}>
          <div className="rounded-2xl border border-border bg-surface p-6 shadow-xl sm:p-8">
            {done ? (
              <div className="flex flex-col items-center py-8 text-center" role="status">
                <span className="flex size-14 items-center justify-center rounded-full bg-success/15 text-success">
                  <CheckCircle2 className="size-7" />
                </span>
                <h3 className="mt-4 font-display text-xl font-bold text-foreground">
                  Vous êtes sur la liste&nbsp;!
                </h3>
                <p className="mt-2 max-w-sm text-sm text-muted-foreground">
                  Merci. Nous vous écrirons dès que votre accès sera prêt.
                </p>
                <Button variant="outline" className="mt-6" onClick={() => setDone(false)}>
                  Inscrire une autre personne
                </Button>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="flex flex-col gap-4" noValidate>
                {error ? (
                  <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                    {error}
                  </p>
                ) : null}
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="wl-firstName">Prénom</Label>
                    <Input id="wl-firstName" name="firstName" autoComplete="given-name" required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="wl-email">Adresse e-mail</Label>
                    <Input id="wl-email" name="email" type="email" autoComplete="email" required />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="wl-activity">Activité</Label>
                    <Input id="wl-activity" name="activity" placeholder="Agence, consultant…" />
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <Label htmlFor="wl-country">Pays</Label>
                    <Input id="wl-country" name="country" placeholder="Côte d'Ivoire…" autoComplete="country-name" />
                  </div>
                </div>
                <Button type="submit" variant="accent" size="lg" disabled={pending} className="mt-1">
                  {pending ? <Loader2 className="size-4 animate-spin" /> : null}
                  Rejoindre la liste d&apos;attente
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  Aucune carte bancaire. Vous pouvez vous désinscrire à tout moment.
                </p>
              </form>
            )}
          </div>
        </Reveal>
      </div>
    </section>
  );
}
