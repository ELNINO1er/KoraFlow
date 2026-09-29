"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMotionPref } from "./motion-preferences";

const FRAGMENTS = [
  { label: "Prospect", x: -140, y: -70 },
  { label: "Devis", x: 150, y: -50 },
  { label: "Contrat", x: -160, y: 40 },
  { label: "Paiement", x: 140, y: 70 },
  { label: "Projet", x: 0, y: -110 },
];

export function FinalCTA() {
  const { reduced } = useMotionPref();

  return (
    <section className="px-4 pb-24 sm:px-6 lg:px-8">
      <div className="relative mx-auto max-w-5xl overflow-hidden rounded-3xl bg-primary px-6 py-20 text-center sm:px-12">
        {/* Fragments qui se rassemblent */}
        {FRAGMENTS.map((f, i) => (
          <motion.span
            key={f.label}
            aria-hidden
            initial={reduced ? false : { x: f.x, y: f.y, opacity: 0 }}
            whileInView={{ x: 0, y: 0, opacity: 0.14 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 0.9, delay: i * 0.08, ease: [0.16, 1, 0.3, 1] }}
            className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary-foreground/30 px-3 py-1 text-xs font-medium text-primary-foreground"
          >
            {f.label}
          </motion.span>
        ))}

        {/* Le flux dessine le « K » */}
        <div className="relative mx-auto mb-8 flex size-16 items-center justify-center">
          <svg viewBox="0 0 80 100" className="h-16 w-16" fill="none" aria-hidden>
            <motion.path
              d="M22 12 L22 88 M22 52 L58 12 M22 52 L58 88"
              stroke="var(--color-accent)"
              strokeWidth="6"
              strokeLinecap="round"
              strokeLinejoin="round"
              initial={reduced ? false : { pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 1.2, ease: "easeInOut" }}
            />
          </svg>
        </div>

        <motion.h2
          initial={reduced ? false : { opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.6 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="relative mx-auto max-w-2xl font-display text-3xl font-bold tracking-tight text-primary-foreground sm:text-4xl"
        >
          Toute votre activité. Un seul espace. Un flux parfaitement orchestré.
        </motion.h2>

        <div className="relative mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild variant="accent" size="lg">
            <Link href="/register">
              Commencer gratuitement
              <ArrowRight className="size-4" />
            </Link>
          </Button>
          <Button
            asChild
            size="lg"
            variant="outline"
            className="border-primary-foreground/30 bg-transparent text-primary-foreground hover:bg-primary-foreground/10"
          >
            <a href="#tarifs">Demander une présentation</a>
          </Button>
        </div>
      </div>
    </section>
  );
}
