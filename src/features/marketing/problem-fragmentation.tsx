"use client";

import { motion } from "motion/react";
import { MessageCircle, Table2, Mail, FolderOpen, Layers, AlertTriangle } from "lucide-react";
import { Reveal, SectionHeading } from "./reveal";
import { useMotionPref } from "./motion-preferences";

/** Fenêtres génériques (aucun logo réel) qui se font absorber par KoraFlow. */
const FRAGMENTS = [
  { icon: MessageCircle, label: "Messagerie", x: -120, y: -60, r: -8 },
  { icon: Table2, label: "Tableur", x: 130, y: -40, r: 7 },
  { icon: Mail, label: "E-mails", x: -110, y: 70, r: 6 },
  { icon: FolderOpen, label: "Fichiers", x: 120, y: 80, r: -6 },
];

const CONSEQUENCES = [
  "Informations perdues d'un outil à l'autre",
  "Relances oubliées, opportunités qui refroidissent",
  "Paiements retardés faute de suivi clair",
];

export function ProblemFragmentation() {
  const { reduced } = useMotionPref();

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading
        kicker="Le problème"
        title={<>Votre activité ne devrait pas être dispersée dans dix outils.</>}
        subtitle="Messagerie, tableurs, e-mails, documents… chaque outil détient un morceau. KoraFlow les réunit."
      />

      <div className="relative mx-auto mt-14 flex h-[320px] max-w-3xl items-center justify-center sm:h-[360px]">
        {/* Fragments dispersés qui convergent vers le centre */}
        {FRAGMENTS.map((f, i) => {
          const Icon = f.icon;
          return (
            <motion.div
              key={f.label}
              aria-hidden
              initial={reduced ? false : { x: f.x, y: f.y, rotate: f.r, opacity: 1 }}
              whileInView={reduced ? undefined : { x: 0, y: 0, rotate: 0, opacity: 0, scale: 0.6 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.9, delay: i * 0.1, ease: [0.65, 0, 0.35, 1] }}
              className="absolute flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 shadow-md"
            >
              <Icon className="size-4 text-muted-foreground" />
              <span className="text-xs font-medium text-foreground">{f.label}</span>
            </motion.div>
          );
        })}

        {/* Panneau KoraFlow central qui se forme */}
        <motion.div
          initial={reduced ? false : { opacity: 0, scale: 0.9 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.7, delay: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="relative z-10 w-64 rounded-2xl border border-accent/30 bg-surface p-5 shadow-xl"
        >
          <div className="flex items-center gap-2">
            <span className="flex size-9 items-center justify-center rounded-xl bg-accent text-accent-foreground">
              <Layers className="size-5" />
            </span>
            <div>
              <p className="font-display text-sm font-bold text-foreground">KoraFlow</p>
              <p className="text-[11px] text-muted-foreground">Tout, au même endroit</p>
            </div>
          </div>
          <div className="mt-4 space-y-2">
            {["Clients", "Devis & factures", "Paiements", "Projets"].map((row) => (
              <div key={row} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2">
                <span className="text-xs text-foreground">{row}</span>
                <span className="size-1.5 rounded-full bg-success" />
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      <div className="mt-10 grid gap-4 sm:grid-cols-3">
        {CONSEQUENCES.map((c, i) => (
          <Reveal key={c} variant="up" delay={i * 0.08}>
            <div className="flex h-full items-start gap-3 rounded-xl border border-border bg-surface p-4">
              <AlertTriangle className="mt-0.5 size-5 shrink-0 text-warning" />
              <p className="text-sm text-foreground">{c}</p>
            </div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
