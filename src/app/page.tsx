import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  Check,
  Users,
  FileText,
  PenLine,
  Smartphone,
  FolderKanban,
  Globe2,
  ShieldCheck,
  CalendarClock,
  Receipt,
  Bell,
} from "lucide-react";
import { resolveSession } from "@/server/auth/context";
import { Button } from "@/components/ui/button";

const FEATURES = [
  {
    icon: Users,
    title: "CRM & prospects",
    description:
      "Centralisez contacts et prospects, suivez chaque affaire dans un pipeline clair, de la première demande à la signature.",
  },
  {
    icon: FileText,
    title: "Devis & factures",
    description:
      "Créez des devis et factures pro en quelques clics, avec calculs automatiques, TVA et export PDF.",
  },
  {
    icon: PenLine,
    title: "Contrats signés en ligne",
    description:
      "Envoyez un contrat, votre client le signe à distance. Consentement et empreinte horodatés, valeur probante.",
  },
  {
    icon: Smartphone,
    title: "Paiements Mobile Money",
    description:
      "Wave, Orange Money, MTN : le client déclare son paiement, un responsable le valide. Rien n'est confirmé à votre place.",
  },
  {
    icon: FolderKanban,
    title: "Projets & tâches",
    description:
      "Dès qu'une facture est payée, le projet se crée automatiquement. Suivez l'avancement par étapes et tâches.",
  },
  {
    icon: Globe2,
    title: "Portail client",
    description:
      "Un espace unique où votre client retrouve ses devis, contrats, factures et projets, sans créer de compte.",
  },
];

const STEPS = [
  {
    n: "1",
    title: "Le prospect vous contacte",
    description:
      "Via un formulaire public ou une prise de rendez-vous en ligne — le contact est créé automatiquement.",
  },
  {
    n: "2",
    title: "Devis, contrat, facture",
    description:
      "Vous proposez, le client accepte et signe en ligne. La facture part avec son lien de paiement.",
  },
  {
    n: "3",
    title: "Paiement puis livraison",
    description:
      "Le paiement est déclaré puis validé, le projet démarre, et tout reste tracé dans un seul espace.",
  },
];

const TRUST = [
  { icon: ShieldCheck, label: "Données isolées par entreprise" },
  { icon: Receipt, label: "Multi-devise (XOF, EUR…)" },
  { icon: CalendarClock, label: "Rendez-vous en ligne" },
  { icon: Bell, label: "Notifications en temps réel" },
];

export default async function Home() {
  const session = await resolveSession();
  if (session.status === "ok") redirect("/dashboard");
  if (session.status === "no-organization") redirect("/create-organization");
  if (session.status === "suspended") redirect("/compte-suspendu");

  return (
    <>
      {/* ---------- En-tête ---------- */}
      <header className="sticky top-0 z-40 border-b border-border/70 bg-background/80 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <Link href="/" className="font-display text-xl font-bold tracking-tight text-foreground">
            Kora<span className="text-accent">Flow</span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm font-medium text-muted-foreground md:flex">
            <a href="#fonctionnalites" className="transition-colors hover:text-foreground">Fonctionnalités</a>
            <a href="#etapes" className="transition-colors hover:text-foreground">Comment ça marche</a>
            <a href="#paiements" className="transition-colors hover:text-foreground">Paiements</a>
          </nav>

          <div className="flex items-center gap-2">
            <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
              <Link href="/login">Se connecter</Link>
            </Button>
            <Button asChild variant="accent" size="sm">
              <Link href="/register">Créer un compte</Link>
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1">
        {/* ---------- Hero ---------- */}
        <section className="relative overflow-hidden">
          <div
            aria-hidden
            className="pointer-events-none absolute -top-24 left-1/2 h-80 w-[46rem] max-w-full -translate-x-1/2 rounded-full bg-accent/20 blur-3xl"
          />
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-16 sm:px-6 lg:grid-cols-2 lg:gap-8 lg:py-24 lg:px-8">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
                <span className="size-1.5 rounded-full bg-accent" />
                Conçu pour les PME d&apos;Afrique francophone
              </span>

              <h1 className="mt-5 font-display text-4xl font-bold leading-[1.1] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
                Votre entreprise,
                <br />
                <span className="text-accent">parfaitement orchestrée.</span>
              </h1>

              <p className="mt-5 max-w-xl text-lg text-muted-foreground">
                KoraFlow réunit clients, devis, contrats, paiements Mobile Money et projets
                dans un seul espace — de la première demande jusqu&apos;à la livraison.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild variant="accent" size="lg">
                  <Link href="/register">
                    Créer mon compte
                    <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg">
                  <Link href="/login">Se connecter</Link>
                </Button>
              </div>

              <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                <Check className="size-4 text-success" />
                Sans carte bancaire · Mise en route en quelques minutes
              </p>
            </div>

            {/* Aperçu visuel (décoratif) */}
            <HeroPreview />
          </div>
        </section>

        {/* ---------- Bandeau confiance ---------- */}
        <section className="border-y border-border bg-surface/60">
          <div className="mx-auto grid max-w-6xl grid-cols-2 gap-4 px-4 py-6 sm:px-6 lg:grid-cols-4 lg:px-8">
            {TRUST.map(({ icon: Icon, label }) => (
              <div key={label} className="flex items-center gap-2.5 text-sm text-muted-foreground">
                <Icon className="size-5 shrink-0 text-accent" />
                <span>{label}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ---------- Fonctionnalités ---------- */}
        <section id="fonctionnalites" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-2xl text-center">
            <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
              Tout votre cycle commercial, au même endroit
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Fini les tableurs éparpillés et les relances oubliées. Chaque étape s&apos;enchaîne
              naturellement.
            </p>
          </div>

          <div className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, description }) => (
              <article
                key={title}
                className="group rounded-2xl border border-border bg-surface p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
                  <Icon className="size-5" />
                </div>
                <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
              </article>
            ))}
          </div>
        </section>

        {/* ---------- Étapes ---------- */}
        <section id="etapes" className="border-y border-border bg-surface/60">
          <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                De la demande au paiement, sans friction
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Un flux pensé pour aller vite, sans rien perdre en route.
              </p>
            </div>

            <ol className="mt-14 grid gap-8 md:grid-cols-3">
              {STEPS.map((step) => (
                <li key={step.n} className="relative">
                  <div className="flex size-12 items-center justify-center rounded-full bg-primary font-display text-lg font-bold text-primary-foreground">
                    {step.n}
                  </div>
                  <h3 className="mt-5 font-display text-xl font-semibold text-foreground">{step.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.description}</p>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* ---------- Paiements Mobile Money ---------- */}
        <section id="paiements" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
                <Smartphone className="size-4" />
                Adapté au terrain
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
                Encaissez comme vos clients paient
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Wave, Orange Money, MTN Money ou espèces : votre client déclare son paiement depuis
                son portail, un responsable le valide. Vous gardez le contrôle — une redirection ne
                vaut jamais confirmation.
              </p>
              <ul className="mt-6 space-y-3">
                {[
                  "Suivi des paiements partiels et soldes restants",
                  "Validation manuelle par un responsable habilité",
                  "Projet créé automatiquement une fois la facture payée",
                ].map((item) => (
                  <li key={item} className="flex items-start gap-3 text-sm text-foreground">
                    <Check className="mt-0.5 size-5 shrink-0 text-success" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-3 gap-4" aria-hidden>
              {["Wave", "Orange Money", "MTN"].map((name) => (
                <div
                  key={name}
                  className="flex aspect-square flex-col items-center justify-center gap-2 rounded-2xl border border-border bg-surface p-4 text-center shadow-sm"
                >
                  <Smartphone className="size-7 text-accent" />
                  <span className="text-sm font-semibold text-foreground">{name}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ---------- CTA final ---------- */}
        <section className="px-4 pb-20 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-6xl overflow-hidden rounded-3xl bg-primary px-6 py-16 text-center sm:px-12">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl">
              Prêt à orchestrer votre entreprise&nbsp;?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-primary-foreground/80">
              Créez votre espace en quelques minutes et gérez votre activité de bout en bout.
            </p>
            <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
              <Button asChild variant="accent" size="lg">
                <Link href="/register">
                  Créer mon compte
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
              >
                <Link href="/login">J&apos;ai déjà un compte</Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* ---------- Pied de page ---------- */}
      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              Kora<span className="text-accent">Flow</span>
            </span>
            <span className="text-sm text-muted-foreground">· Plus loin, ensemble</span>
          </div>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="/login" className="transition-colors hover:text-foreground">Se connecter</Link>
            <Link href="/register" className="transition-colors hover:text-foreground">Créer un compte</Link>
          </div>
          <p className="text-sm text-muted-foreground">
            © {2026} KoraFlow. Tous droits réservés.
          </p>
        </div>
      </footer>
    </>
  );
}

/** Aperçu décoratif de l'application affiché dans le hero. */
function HeroPreview() {
  const bars = [42, 68, 55, 80, 62, 95];
  return (
    <div aria-hidden className="relative">
      <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <span className="font-display text-sm font-semibold text-foreground">Tableau de bord</span>
          <span className="flex gap-1">
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-border" />
            <span className="size-2.5 rounded-full bg-accent" />
          </span>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { k: "Chiffre d'affaires", v: "4,3 M" },
            { k: "Devis en cours", v: "12" },
            { k: "Encaissé", v: "82 %" },
          ].map((s) => (
            <div key={s.k} className="rounded-xl bg-muted p-3">
              <p className="truncate text-[11px] text-muted-foreground">{s.k}</p>
              <p className="mt-1 font-display text-lg font-bold text-foreground">{s.v}</p>
            </div>
          ))}
        </div>

        <div className="mt-4 flex h-28 items-end gap-2 rounded-xl bg-muted p-3">
          {bars.map((h, i) => (
            <div
              key={i}
              className="flex-1 rounded-t bg-accent/70"
              style={{ height: `${h}%` }}
            />
          ))}
        </div>
      </div>

      {/* Notification flottante */}
      <div className="absolute -bottom-5 -left-4 flex items-center gap-3 rounded-xl border border-border bg-surface px-4 py-3 shadow-lg sm:-left-6">
        <span className="flex size-9 items-center justify-center rounded-full bg-success/15 text-success">
          <Check className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold text-foreground">Paiement validé</p>
          <p className="text-[11px] text-muted-foreground">Facture FAC-2026-0001</p>
        </div>
      </div>
    </div>
  );
}
