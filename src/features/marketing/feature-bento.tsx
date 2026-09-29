"use client";

import { motion } from "motion/react";
import {
  Users,
  FileInput,
  CalendarClock,
  FileText,
  PenLine,
  Receipt,
  Smartphone,
  FolderKanban,
  Globe2,
  LineChart,
  type LucideIcon,
} from "lucide-react";
import { Reveal, SectionHeading } from "./reveal";
import { useMotionPref } from "./motion-preferences";

export function FeatureBento() {
  return (
    <section id="fonctionnalites" className="mx-auto max-w-6xl px-4 py-20 sm:px-6 lg:px-8">
      <SectionHeading
        kicker="Fonctionnalités"
        title="Dix modules, un seul flux"
        subtitle="Chaque brique communique avec les autres. L'animation d'une carte démarre quand elle apparaît."
      />

      <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Grande carte — Tableaux de bord (chart animé) */}
        <BentoCard
          icon={LineChart}
          title="Tableaux de bord"
          description="Vos indicateurs se dessinent en temps réel : CA, conversion, encaissements."
          className="lg:col-span-2 lg:row-span-2"
          visual={<ChartVisual />}
          big
        />

        <BentoCard icon={Users} title="CRM & prospects" description="Un pipeline clair, du premier contact à la signature." visual={<PipelineVisual />} />
        <BentoCard icon={FileInput} title="Formulaires" description="Des formulaires publics qui créent des prospects." visual={<FormVisual />} />

        {/* Grande carte — Contrats (signature) */}
        <BentoCard
          icon={PenLine}
          title="Contrats signés en ligne"
          description="Le client signe à distance ; empreinte horodatée."
          className="lg:col-span-2"
          visual={<SignatureVisual />}
        />

        <BentoCard icon={CalendarClock} title="Rendez-vous" description="Réservation en ligne, agenda verrouillé." visual={<CalendarVisual />} />
        <BentoCard icon={FileText} title="Devis" description="Calcul automatique, TVA, export PDF." />
        <BentoCard icon={Receipt} title="Factures" description="Le statut évolue : envoyée, puis payée." visual={<StatusVisual />} />
        <BentoCard icon={Smartphone} title="Paiements" description="Le client déclare, votre équipe valide." />
        <BentoCard icon={FolderKanban} title="Projets" description="Créés au paiement, avancement par tâches." visual={<ProgressVisual />} />
        <BentoCard icon={Globe2} title="Portail client" description="Devis, contrats, factures et projets réunis." />
      </div>
    </section>
  );
}

function BentoCard({
  icon: Icon,
  title,
  description,
  className,
  visual,
  big,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  visual?: React.ReactNode;
  big?: boolean;
}) {
  return (
    <Reveal variant="up" amount={0.3} className={className}>
      <article
        tabIndex={0}
        className="group flex h-full flex-col rounded-2xl border border-border bg-surface p-5 shadow-sm outline-none transition-all duration-300 hover:-translate-y-1 hover:shadow-md focus-visible:ring-2 focus-visible:ring-ring"
      >
        <div className="flex size-10 items-center justify-center rounded-xl bg-accent/10 text-accent transition-colors group-hover:bg-accent group-hover:text-accent-foreground">
          <Icon className="size-5" />
        </div>
        <h3 className="mt-4 font-display text-base font-semibold text-foreground">{title}</h3>
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
        {visual ? <div className={`mt-4 ${big ? "flex-1" : ""}`}>{visual}</div> : null}
      </article>
    </Reveal>
  );
}

/* ---------- Visuels animés (démarrent à l'apparition) ---------- */

function ChartVisual() {
  const { reduced } = useMotionPref();
  const bars = [40, 62, 50, 78, 66, 90, 72];
  return (
    <div className="flex h-full min-h-[9rem] items-end gap-2 rounded-xl bg-muted p-4">
      {bars.map((h, i) => (
        <motion.div
          key={i}
          className="flex-1 origin-bottom rounded-t bg-accent/70"
          style={{ height: `${h}%` }}
          initial={reduced ? false : { scaleY: 0 }}
          whileInView={{ scaleY: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ duration: 0.6, delay: i * 0.06, ease: [0.16, 1, 0.3, 1] }}
        />
      ))}
    </div>
  );
}

function SignatureVisual() {
  const { reduced } = useMotionPref();
  return (
    <div className="rounded-xl bg-muted p-4">
      <svg viewBox="0 0 200 40" className="h-12 w-full" fill="none">
        <motion.path
          d="M4 30 C 24 6, 34 34, 52 20 S 82 4, 96 24 S 128 34, 150 14 196 18 196 18"
          stroke="var(--color-accent)"
          strokeWidth="2.5"
          strokeLinecap="round"
          initial={reduced ? false : { pathLength: 0 }}
          whileInView={{ pathLength: 1 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 1.1, ease: "easeInOut" }}
        />
      </svg>
      <p className="mt-1 text-[11px] text-muted-foreground">Signé le 12/03/2026 · empreinte SHA-256</p>
    </div>
  );
}

function StatusVisual() {
  const { reduced } = useMotionPref();
  return (
    <div className="flex items-center gap-2 rounded-xl bg-muted p-3 text-xs">
      <span className="rounded-full bg-warning/15 px-2 py-0.5 font-medium text-warning">Envoyée</span>
      <motion.span
        aria-hidden
        initial={reduced ? false : { x: -4, opacity: 0.4 }}
        whileInView={{ x: 0, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="text-muted-foreground"
      >
        →
      </motion.span>
      <motion.span
        initial={reduced ? false : { scale: 0.8, opacity: 0 }}
        whileInView={{ scale: 1, opacity: 1 }}
        viewport={{ once: true }}
        transition={{ duration: 0.4, delay: 0.5 }}
        className="rounded-full bg-success/15 px-2 py-0.5 font-medium text-success"
      >
        Payée
      </motion.span>
    </div>
  );
}

function CalendarVisual() {
  const { reduced } = useMotionPref();
  const cells = Array.from({ length: 14 });
  const picked = 9;
  return (
    <div className="grid grid-cols-7 gap-1 rounded-xl bg-muted p-3">
      {cells.map((_, i) => (
        <motion.span
          key={i}
          initial={false}
          whileInView={reduced ? undefined : { scale: i === picked ? [1, 1.25, 1] : 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className={`aspect-square rounded ${i === picked ? "bg-accent" : "bg-surface"}`}
        />
      ))}
    </div>
  );
}

function PipelineVisual() {
  const rows = ["Nouveau", "Devis", "Gagné"];
  return (
    <div className="space-y-1.5">
      {rows.map((r, i) => (
        <motion.div
          key={r}
          initial={{ opacity: 0, x: -8 }}
          whileInView={{ opacity: 1, x: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: i * 0.12 }}
          className="flex items-center justify-between rounded-lg bg-muted px-3 py-1.5 text-[11px] text-foreground"
        >
          {r}
          <span className="size-1.5 rounded-full bg-accent" />
        </motion.div>
      ))}
    </div>
  );
}

function FormVisual() {
  return (
    <div className="space-y-1.5 rounded-xl bg-muted p-3">
      {[70, 90, 55].map((w, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, width: 0 }}
          whileInView={{ opacity: 1, width: `${w}%` }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: i * 0.12 }}
          className="h-2 rounded bg-surface"
        />
      ))}
    </div>
  );
}

function ProgressVisual() {
  const { reduced } = useMotionPref();
  return (
    <div className="rounded-xl bg-muted p-3">
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface">
        <motion.div
          className="h-full origin-left rounded-full bg-success"
          style={{ width: "72%" }}
          initial={reduced ? false : { scaleX: 0 }}
          whileInView={{ scaleX: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        />
      </div>
      <p className="mt-1.5 text-[11px] text-muted-foreground">72 % · 8 tâches sur 11</p>
    </div>
  );
}
