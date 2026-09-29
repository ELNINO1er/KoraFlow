"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Users, Wallet, FileClock, ReceiptText, FolderKanban } from "lucide-react";
import { Reveal, SectionHeading } from "./reveal";
import { useMotionPref } from "./motion-preferences";

type Period = "Semaine" | "Mois" | "Trimestre" | "Année";
const PERIODS: Period[] = ["Semaine", "Mois", "Trimestre", "Année"];

// Données FICTIVES de démonstration (aucune performance réelle).
const DATA: Record<Period, { bars: number[]; stats: string[] }> = {
  Semaine: { bars: [40, 55, 48, 70, 62, 80, 58], stats: ["7", "1,2 M", "3", "2", "4"] },
  Mois: { bars: [52, 61, 47, 73, 66, 84, 90], stats: ["28", "4,3 M", "12", "5", "9"] },
  Trimestre: { bars: [60, 72, 65, 80, 74, 88, 95], stats: ["83", "12,8 M", "21", "7", "17"] },
  Année: { bars: [48, 66, 71, 83, 79, 92, 99], stats: ["312", "48,5 M", "34", "11", "41"] },
};

const STAT_META = [
  { icon: Users, label: "Prospects" },
  { icon: Wallet, label: "CA encaissé (XOF)" },
  { icon: FileClock, label: "Devis en attente" },
  { icon: ReceiptText, label: "Factures impayées" },
  { icon: FolderKanban, label: "Projets actifs" },
];

export function DashboardDemo() {
  const { reduced } = useMotionPref();
  const [period, setPeriod] = useState<Period>("Mois");
  const data = DATA[period];

  return (
    <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading
        kicker="Le tableau de bord"
        title="Toute votre activité, d'un coup d'œil"
        subtitle="Des données de démonstration, mises à jour à chaque période sélectionnée."
      />

      <Reveal variant="up" amount={0.2} className="mt-12" duration={0.8}>
        <motion.div
          initial={reduced ? false : { rotateX: 8, opacity: 0, y: 30 }}
          whileInView={{ rotateX: 0, opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.3 }}
          transition={{ duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
          style={{ transformPerspective: 1200 }}
          className="rounded-2xl border border-border bg-surface p-5 shadow-xl sm:p-6"
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-display text-lg font-bold text-foreground">Tableau de bord</p>
              <p className="text-xs text-muted-foreground">Données de démonstration</p>
            </div>
            <div
              role="tablist"
              aria-label="Période"
              className="inline-flex rounded-lg border border-border bg-muted p-1"
            >
              {PERIODS.map((p) => (
                <button
                  key={p}
                  role="tab"
                  aria-selected={p === period}
                  onClick={() => setPeriod(p)}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    p === period ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {STAT_META.map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={s.label} className="rounded-xl bg-muted p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-muted-foreground">{s.label}</span>
                    <Icon className="size-4 text-muted-foreground" />
                  </div>
                  <motion.p
                    key={`${period}-${i}`}
                    initial={reduced ? false : { opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.35, delay: i * 0.04 }}
                    className="mt-1 font-display text-lg font-bold text-foreground"
                  >
                    {data.stats[i]}
                  </motion.p>
                </div>
              );
            })}
          </div>

          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            <div className="rounded-xl bg-muted p-4 lg:col-span-2">
              <p className="text-xs font-medium text-muted-foreground">Chiffre d&apos;affaires</p>
              <div className="mt-3 flex h-40 items-end gap-2.5">
                {data.bars.map((h, i) => (
                  <motion.div
                    key={i}
                    className="flex-1 rounded-t bg-accent/70"
                    animate={{ height: `${h}%` }}
                    transition={{ duration: reduced ? 0 : 0.5, ease: [0.16, 1, 0.3, 1] }}
                    style={{ height: `${h}%` }}
                  />
                ))}
              </div>
            </div>

            <div className="rounded-xl bg-muted p-4">
              <p className="text-xs font-medium text-muted-foreground">Activité récente</p>
              <ul className="mt-3 space-y-2.5">
                {[
                  "Devis DEV-0142 accepté",
                  "Paiement validé · FAC-0098",
                  "Nouveau prospect · Baobab",
                  "Contrat CTR-0031 signé",
                ].map((a) => (
                  <li key={a} className="flex items-center gap-2 text-xs text-foreground">
                    <span className="size-1.5 shrink-0 rounded-full bg-success" />
                    {a}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </motion.div>
      </Reveal>
    </section>
  );
}
