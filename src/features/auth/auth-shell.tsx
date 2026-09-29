"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { motion } from "motion/react";
import { UserPlus, FileCheck2, Wallet, FolderKanban, Check } from "lucide-react";
import { useMotionPref } from "@/features/marketing/motion-preferences";

/**
 * Coquille d'authentification en deux volets :
 * - à gauche (desktop) une composition animée sobre qui montre l'activité
 *   d'une entreprise qui continue de progresser ;
 * - à droite le formulaire, élément principal (et seul volet sur mobile).
 */
export function AuthShell({
  children,
  phrases,
  tone = "default",
}: {
  children: ReactNode;
  phrases?: string[];
  tone?: "default" | "calm";
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-primary p-10 text-primary-foreground lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="pointer-events-none absolute -right-24 top-0 h-96 w-96 rounded-full bg-accent/20 blur-3xl"
        />
        <Link href="/" className="relative font-display text-2xl font-bold tracking-tight">
          Kora<span className="text-accent">Flow</span>
        </Link>

        <AuthVisualStory tone={tone} phrases={phrases} />

        <p className="relative text-sm text-primary-foreground/60">
          Votre entreprise, parfaitement orchestrée.
        </p>
      </aside>

      <main className="flex min-h-screen flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-md">
          <Link
            href="/"
            className="mb-8 inline-block font-display text-xl font-bold tracking-tight text-foreground lg:hidden"
          >
            Kora<span className="text-accent">Flow</span>
          </Link>
          {children}
        </div>
      </main>
    </div>
  );
}

const EVENTS = [
  { icon: UserPlus, label: "Nouveau prospect", meta: "Formulaire public" },
  { icon: FileCheck2, label: "Devis accepté", meta: "DEV-2026-0142" },
  { icon: Wallet, label: "Paiement validé", meta: "par votre équipe" },
  { icon: FolderKanban, label: "Projet en cours", meta: "3 tâches sur 8" },
];

const DEFAULT_PHRASES = [
  "Votre espace de travail vous attend.",
  "Continuez là où vous vous êtes arrêté.",
  "Reprenez le contrôle de votre activité.",
];

function AuthVisualStory({ tone, phrases }: { tone: "default" | "calm"; phrases?: string[] }) {
  const { reduced } = useMotionPref();
  const list = phrases ?? DEFAULT_PHRASES;
  const [active, setActive] = useState(reduced ? EVENTS.length - 1 : 0);
  const [phrase, setPhrase] = useState(0);

  useEffect(() => {
    if (reduced) return;
    const id = setInterval(() => setActive((a) => (a + 1) % (EVENTS.length + 1)), 1600);
    return () => clearInterval(id);
  }, [reduced]);

  useEffect(() => {
    if (reduced || list.length <= 1) return;
    const id = setInterval(() => setPhrase((p) => (p + 1) % list.length), 4200);
    return () => clearInterval(id);
  }, [reduced, list.length]);

  return (
    <div className="relative max-w-sm">
      <p
        className={`font-display text-2xl font-bold leading-snug ${
          tone === "calm" ? "text-primary-foreground/90" : ""
        }`}
        aria-live="off"
      >
        <motion.span
          key={phrase}
          initial={reduced ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-block"
        >
          {list[phrase]}
        </motion.span>
      </p>

      {/* Fil vertical (Kora Line) reliant les événements */}
      <div className="relative mt-8">
        <span
          aria-hidden
          className="absolute bottom-3 left-[11px] top-3 w-px bg-primary-foreground/15"
        />
        <motion.span
          aria-hidden
          className="absolute left-[11px] top-3 w-px origin-top bg-accent"
          style={{ bottom: 12 }}
          animate={{ scaleY: reduced ? 1 : Math.min(1, active / Math.max(1, EVENTS.length - 1)) }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        />

        <ul className="flex flex-col gap-4">
          {EVENTS.map((e, i) => {
            const Icon = e.icon;
            const done = reduced || i < active;
            const current = !reduced && i === active;
            return (
              <li key={e.label} className="flex items-center gap-3">
                <span
                  className={`z-10 flex size-6 shrink-0 items-center justify-center rounded-full border transition-colors duration-500 ${
                    done
                      ? "border-accent bg-accent text-accent-foreground"
                      : current
                        ? "border-accent bg-primary text-accent"
                        : "border-primary-foreground/20 bg-primary text-primary-foreground/40"
                  }`}
                >
                  {done ? <Check className="size-3.5" /> : <Icon className="size-3.5" />}
                </span>
                <motion.div
                  initial={false}
                  animate={{ opacity: done || current ? 1 : 0.45 }}
                  transition={{ duration: 0.4 }}
                  className="flex flex-1 items-center justify-between gap-3 rounded-xl border border-primary-foreground/10 bg-primary-foreground/5 px-3 py-2"
                >
                  <span className="text-sm font-medium text-primary-foreground">{e.label}</span>
                  <span className="text-[11px] text-primary-foreground/50">{e.meta}</span>
                </motion.div>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
