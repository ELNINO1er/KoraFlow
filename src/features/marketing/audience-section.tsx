"use client";

import { User, Briefcase, Building2, Wrench, Factory, HeartHandshake, type LucideIcon } from "lucide-react";
import { Reveal, SectionHeading } from "./reveal";

const AUDIENCES: { icon: LucideIcon; title: string; journey: string }[] = [
  { icon: User, title: "Indépendants", journey: "Devis, contrat, paiement suivi — sans paperasse dispersée." },
  { icon: Briefcase, title: "Consultants", journey: "Propositions, signatures et suivi de mission au même endroit." },
  { icon: Building2, title: "Agences", journey: "Pipeline commercial partagé et projets livrés en équipe." },
  { icon: Wrench, title: "Prestataires de services", journey: "Rendez-vous, interventions et facturation reliés." },
  { icon: Factory, title: "PME", journey: "Une vue claire sur les ventes, les encaissements et les projets." },
  { icon: HeartHandshake, title: "ONG", journey: "Suivi des partenaires, documents et projets, en toute traçabilité." },
];

export function AudienceSection() {
  return (
    <section id="solutions" className="border-y border-border bg-surface/50">
      <div className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
        <SectionHeading
          kicker="Pour qui"
          title="Un flux qui s'adapte à votre métier"
          subtitle="Survolez ou sélectionnez un profil pour voir le parcours correspondant."
        />

        <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {AUDIENCES.map((a, i) => {
            const Icon = a.icon;
            return (
              <Reveal key={a.title} variant="up" delay={(i % 3) * 0.08}>
                <article
                  tabIndex={0}
                  className="group h-full rounded-2xl border border-border bg-surface p-5 outline-none transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <div className="flex size-11 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground group-focus-within:bg-accent group-focus-within:text-accent-foreground">
                    <Icon className="size-5" />
                  </div>
                  <h3 className="mt-4 font-display text-lg font-semibold text-foreground">{a.title}</h3>
                  {/* Parcours révélé au survol / focus (accessible clavier & tactile) */}
                  <div className="grid grid-rows-[0fr] opacity-0 transition-all duration-300 group-hover:grid-rows-[1fr] group-hover:opacity-100 group-focus-within:grid-rows-[1fr] group-focus-within:opacity-100 motion-reduce:grid-rows-[1fr] motion-reduce:opacity-100">
                    <p className="mt-2 overflow-hidden text-sm text-muted-foreground">{a.journey}</p>
                  </div>
                </article>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
