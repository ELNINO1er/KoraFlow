"use client";

import { useRef } from "react";
import { motion, useScroll } from "motion/react";
import { FileInput, CalendarClock, FileText, PenLine, Smartphone, FolderKanban } from "lucide-react";
import { Reveal, SectionHeading } from "./reveal";
import { useMotionPref } from "./motion-preferences";

const STEPS = [
  { icon: FileInput, title: "Demande", body: "Un formulaire public capture la demande — elle devient automatiquement un prospect." },
  { icon: CalendarClock, title: "Rendez-vous", body: "Le prospect réserve un créneau en ligne ; l'agenda se verrouille." },
  { icon: FileText, title: "Devis", body: "Les lignes se calculent, la TVA s'applique, le devis part en PDF." },
  { icon: PenLine, title: "Contrat", body: "Le client signe à distance ; consentement et empreinte horodatés." },
  { icon: Smartphone, title: "Paiement", body: null, payment: true },
  { icon: FolderKanban, title: "Projet", body: "Après validation, les tâches s'ordonnent et l'avancement démarre." },
];

const PAYMENT_FLOW = [
  "Le client indique qu'il a payé",
  "Il fournit une référence / preuve",
  "Votre équipe vérifie",
  "Elle valide ou refuse",
  "Facture et projet se mettent à jour",
];

export function JourneyTimeline() {
  const { reduced } = useMotionPref();
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start 65%", "end 35%"],
  });

  return (
    <section id="parcours" className="border-y border-border bg-surface/50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Le parcours"
          title="De la demande au projet, une impulsion continue"
          subtitle="Chaque étape déclenche la suivante. Rien ne se perd entre deux outils."
        />

        <div ref={ref} className="relative mt-16">
          {/* Ligne de flux — horizontale (desktop) */}
          <div className="absolute left-0 right-0 top-6 hidden h-0.5 bg-border md:block">
            <motion.div
              className="h-full origin-left bg-accent"
              style={{ scaleX: reduced ? 1 : scrollYProgress }}
            />
          </div>
          {/* Ligne de flux — verticale (mobile) */}
          <div className="absolute bottom-0 left-6 top-0 w-0.5 bg-border md:hidden">
            <motion.div
              className="h-full w-full origin-top bg-accent"
              style={{ scaleY: reduced ? 1 : scrollYProgress }}
            />
          </div>

          <ol className="grid gap-8 md:grid-cols-6 md:gap-4">
            {STEPS.map((step, i) => {
              const Icon = step.icon;
              return (
                <li key={step.title} className="relative pl-16 md:pl-0">
                  <Reveal variant="up" delay={i * 0.06} amount={0.4}>
                    <div className="absolute left-0 top-0 flex size-12 items-center justify-center rounded-full border border-accent/40 bg-surface text-accent shadow-sm md:relative md:size-12">
                      <Icon className="size-5" />
                    </div>
                    <h3 className="mt-0 font-display text-base font-semibold text-foreground md:mt-4">
                      {step.title}
                    </h3>
                    {step.payment ? (
                      <ol className="mt-2 space-y-1">
                        {PAYMENT_FLOW.map((p, j) => (
                          <li key={p} className="flex gap-1.5 text-xs text-muted-foreground">
                            <span className="font-semibold text-accent">{j + 1}.</span>
                            <span>{p}</span>
                          </li>
                        ))}
                      </ol>
                    ) : (
                      <p className="mt-2 text-sm text-muted-foreground">{step.body}</p>
                    )}
                  </Reveal>
                </li>
              );
            })}
          </ol>
        </div>

        <Reveal className="mt-10">
          <p className="rounded-xl border border-accent/20 bg-accent/5 px-4 py-3 text-center text-sm text-foreground">
            <strong className="font-semibold">Paiement, pour de vrai :</strong> aucune confirmation
            automatique. Le client déclare, votre équipe vérifie et valide. Une redirection ne vaut
            jamais preuve de paiement.
          </p>
        </Reveal>
      </div>
    </section>
  );
}
