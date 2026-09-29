"use client";

import { motion } from "motion/react";
import { ShieldCheck, Lock, ScrollText, FileLock2, CheckCircle2, DatabaseBackup } from "lucide-react";
import { Reveal, SectionHeading } from "./reveal";
import { useMotionPref } from "./motion-preferences";

const POINTS = [
  { icon: ShieldCheck, label: "Isolation des données par organisation" },
  { icon: Lock, label: "Permissions vérifiées côté serveur" },
  { icon: ScrollText, label: "Journalisation des actions sensibles" },
  { icon: FileLock2, label: "Documents privés, accès par lien" },
  { icon: CheckCircle2, label: "Validation sécurisée des opérations" },
  { icon: DatabaseBackup, label: "Sauvegardes et surveillance prévues" },
];

const ORBITS = [
  { size: 300, duration: 26, org: "Agence A" },
  { size: 210, duration: 20, org: "Cabinet B" },
  { size: 130, duration: 15, org: "PME C" },
];

export function SecuritySection() {
  return (
    <section id="securite" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <div className="grid items-center gap-12 lg:grid-cols-2">
        <div>
          <SectionHeading
            align="left"
            kicker="Sécurité & confiance"
            title="Vos données restent séparées, protégées et sous contrôle."
            subtitle="Chaque organisation évolue dans son propre espace. Les données ne se croisent jamais."
          />
          <ul className="mt-8 grid gap-3 sm:grid-cols-2">
            {POINTS.map((p, i) => {
              const Icon = p.icon;
              return (
                <Reveal key={p.label} variant="up" delay={i * 0.06}>
                  <li className="flex items-start gap-3 rounded-xl border border-border bg-surface p-3">
                    <Icon className="mt-0.5 size-5 shrink-0 text-accent" />
                    <span className="text-sm text-foreground">{p.label}</span>
                  </li>
                </Reveal>
              );
            })}
          </ul>
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            KoraFlow ne revendique aucune certification ni conformité juridique non vérifiée. La
            signature interne n&apos;est pas une signature électronique qualifiée ; les factures ne
            sont pas présentées comme conformes à la FNE ivoirienne sans intégration validée.
          </p>
        </div>

        <Reveal variant="scale" amount={0.2}>
          <OrbitVisual />
        </Reveal>
      </div>
    </section>
  );
}

function OrbitVisual() {
  const { reduced } = useMotionPref();
  return (
    <div className="relative mx-auto flex h-[340px] w-[340px] max-w-full items-center justify-center">
      {/* Centre */}
      <div className="absolute z-10 flex size-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-lg">
        <ShieldCheck className="size-7" />
      </div>

      {ORBITS.map((orbit, i) => (
        <div
          key={orbit.org}
          className="absolute rounded-full border border-border"
          style={{ width: orbit.size, height: orbit.size }}
        >
          <motion.div
            className="absolute inset-0"
            animate={reduced ? undefined : { rotate: 360 }}
            transition={{ duration: orbit.duration, ease: "linear", repeat: Infinity }}
          >
            <div
              className="absolute left-1/2 top-0 flex -translate-x-1/2 -translate-y-1/2 items-center gap-1.5 rounded-full border border-border bg-surface px-2.5 py-1 shadow-sm"
              style={{ transform: `translate(-50%, -50%) rotate(${i * 40}deg)` }}
            >
              <span className="size-1.5 rounded-full bg-accent" />
              <span className="text-[10px] font-medium text-foreground">{orbit.org}</span>
            </div>
          </motion.div>
        </div>
      ))}
    </div>
  );
}
