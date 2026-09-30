"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowRight,
  UserPlus,
  CalendarClock,
  FileText,
  PenLine,
  Smartphone,
  FolderKanban,
  Check,
  PlayCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Reveal } from "./reveal";
import { Aurora } from "./aurora";
import { useMotionPref } from "./motion-preferences";

const STAGES = [
  { icon: UserPlus, label: "Prospect", caption: "Une demande devient automatiquement un prospect." },
  { icon: CalendarClock, label: "Rendez-vous", caption: "Un rendez-vous se réserve en ligne, sans échange de mails." },
  { icon: FileText, label: "Devis", caption: "Le devis se calcule puis part au client en un clic." },
  { icon: PenLine, label: "Contrat", caption: "Le contrat est signé à distance, horodaté." },
  { icon: Smartphone, label: "Paiement", caption: "Le client déclare le paiement — votre équipe le valide." },
  { icon: FolderKanban, label: "Projet", caption: "Le projet démarre une fois la validation faite." },
];

export function HeroOrchestration() {
  return (
    <section className="relative overflow-hidden pt-28 sm:pt-32">
      <Aurora />
      <div className="relative z-10 mx-auto grid max-w-6xl items-center gap-12 px-4 pb-16 sm:px-6 lg:grid-cols-2 lg:gap-10 lg:pb-24 lg:pl-16">
        <div>
          <Reveal variant="up">
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
              <span className="size-1.5 rounded-full bg-accent" />
              La gestion commerciale, enfin réunie
            </span>
          </Reveal>

          <Reveal variant="up" delay={0.08}>
            <h1 className="mt-5 font-display text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Votre entreprise,
              <br />
              <span className="text-accent">parfaitement orchestrée.</span>
            </h1>
          </Reveal>

          <Reveal variant="up" delay={0.16}>
            <p className="mt-5 max-w-xl text-lg text-muted-foreground">
              Gérez vos clients, contrats, paiements et projets depuis un seul espace — de la
              première demande du prospect jusqu&apos;au paiement et à la livraison.
            </p>
          </Reveal>

          <Reveal variant="up" delay={0.24}>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild variant="accent" size="lg">
                <Link href="/register">
                  Commencer gratuitement
                  <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#parcours">
                  <PlayCircle className="size-4" />
                  Voir comment ça fonctionne
                </a>
              </Button>
            </div>
          </Reveal>

          <Reveal variant="up" delay={0.32}>
            <p className="mt-4 text-sm text-muted-foreground">
              Pensé pour les indépendants, agences et PME.
            </p>
          </Reveal>
        </div>

        <Reveal variant="scale" delay={0.15} amount={0.2}>
          <OrchestrationDemo />
        </Reveal>
      </div>
    </section>
  );
}

function OrchestrationDemo() {
  const { reduced } = useMotionPref();
  const [step, setStep] = useState(reduced ? STAGES.length - 1 : 0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => {
      setStep((s) => (s + 1) % (STAGES.length + 1));
    }, 1700);
    return () => clearInterval(id);
  }, [reduced]);

  // step === STAGES.length : petite pause « tout est orchestré » avant reprise.
  const complete = step >= STAGES.length;
  const activeCaption = complete
    ? "Tout votre cycle, réuni dans un seul flux."
    : (STAGES[step]?.caption ?? "");

  return (
    <div className="kf-floaty relative rounded-2xl border border-border bg-surface p-5 shadow-e4">
      {/* Reflet qui balaie la carte (clippé à ses bords, sans masquer les chips) */}
      <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl">
        <span className="kf-sheen absolute inset-y-0 left-0 w-1/3 bg-gradient-to-r from-transparent via-foreground/5 to-transparent" />
      </span>

      <div className="flex items-center justify-between border-b border-border pb-3">
        <span className="font-display text-sm font-semibold text-foreground">Activité en direct</span>
        <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground">
          <span className="size-2 animate-pulse rounded-full bg-success" />
          démonstration
        </span>
      </div>

      {/* Pipeline animé */}
      <div className="mt-6 flex items-start justify-between">
        {STAGES.map((stage, i) => {
          const Icon = stage.icon;
          const done = complete || i < step;
          const active = !complete && i === step;
          return (
            <div key={stage.label} className="flex flex-1 flex-col items-center gap-2">
              <div className="relative flex w-full items-center justify-center">
                {/* Connecteur */}
                {i > 0 ? (
                  <span
                    className={`absolute right-1/2 top-1/2 h-0.5 w-full -translate-y-1/2 ${
                      done || active ? "bg-accent/60" : "bg-border"
                    }`}
                  />
                ) : null}
                <div
                  className={`relative z-10 flex size-9 items-center justify-center rounded-full border transition-colors duration-500 ${
                    done
                      ? "border-success bg-success/15 text-success"
                      : active
                        ? "border-accent bg-accent text-accent-foreground"
                        : "border-border bg-muted text-muted-foreground"
                  }`}
                >
                  {done ? <Check className="size-4" /> : <Icon className="size-4" />}
                  {active && !reduced ? (
                    <motion.span
                      layoutId="kf-token"
                      className="absolute -inset-1 rounded-full ring-2 ring-accent"
                      transition={{ type: "spring", stiffness: 320, damping: 26 }}
                    />
                  ) : null}
                </div>
              </div>
              <span
                className={`text-center text-[10px] font-medium sm:text-[11px] ${
                  done || active ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {stage.label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Légende explicative synchronisée */}
      <div className="mt-6 min-h-[3.5rem] rounded-xl bg-muted p-3">
        <p className="text-xs font-medium uppercase tracking-wide text-accent">
          {complete ? "Orchestré" : `Étape ${step + 1} / ${STAGES.length}`}
        </p>
        <motion.p
          key={activeCaption}
          initial={reduced ? false : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="mt-1 text-sm text-foreground"
        >
          {activeCaption}
        </motion.p>
        {/* Minuterie visuelle synchronisée sur le rythme des étapes */}
        {!complete && !reduced ? (
          <motion.div
            key={step}
            className="mt-3 h-0.5 rounded-full bg-accent/70"
            style={{ transformOrigin: "left" }}
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ duration: 1.7, ease: "linear" }}
          />
        ) : null}
      </div>

      {/* Chips flottantes contextuelles */}
      <FloatingChip
        show={!reduced && step === 0}
        className="-right-3 -top-3"
        tone="accent"
        title="Nouveau prospect"
        subtitle="Formulaire public"
      />
      <FloatingChip
        show={!reduced && (step === 4 || step === 5)}
        className="-bottom-4 -left-3"
        tone="success"
        title="Paiement validé"
        subtitle="par votre équipe"
      />
    </div>
  );
}

function FloatingChip({
  show,
  className,
  tone,
  title,
  subtitle,
}: {
  show: boolean;
  className: string;
  tone: "accent" | "success";
  title: string;
  subtitle: string;
}) {
  const toneClass = tone === "accent" ? "text-accent" : "text-success";
  return (
    <motion.div
      initial={false}
      animate={{ opacity: show ? 1 : 0, y: show ? 0 : 8, scale: show ? 1 : 0.96 }}
      transition={{ duration: 0.4 }}
      aria-hidden
      className={`absolute z-20 flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-lg ${className}`}
    >
      <span className={`flex size-7 items-center justify-center rounded-full bg-muted ${toneClass}`}>
        <Check className="size-4" />
      </span>
      <div>
        <p className="text-xs font-semibold text-foreground">{title}</p>
        <p className="text-[10px] text-muted-foreground">{subtitle}</p>
      </div>
    </motion.div>
  );
}
