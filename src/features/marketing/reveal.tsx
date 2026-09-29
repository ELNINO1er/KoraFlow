"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { VARIANTS, enter, type RevealVariant } from "./motion";
import { useMotionPref } from "./motion-preferences";

/**
 * Révèle son contenu à l'entrée dans le viewport (opacité + translation légère).
 * Sous mouvement réduit, affiche directement l'état final.
 */
export function Reveal({
  children,
  variant = "up",
  delay = 0,
  duration,
  amount = 0.3,
  once = true,
  className,
}: {
  children: ReactNode;
  variant?: RevealVariant;
  delay?: number;
  duration?: number;
  amount?: number;
  once?: boolean;
  className?: string;
}) {
  const { reduced } = useMotionPref();
  if (reduced) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      variants={VARIANTS[variant]}
      initial="hidden"
      whileInView="show"
      viewport={{ once, amount }}
      transition={enter(delay, duration)}
    >
      {children}
    </motion.div>
  );
}

/** En-tête de section réutilisable (kicker + titre + sous-titre), centré. */
export function SectionHeading({
  kicker,
  title,
  subtitle,
  align = "center",
}: {
  kicker?: string;
  title: ReactNode;
  subtitle?: ReactNode;
  align?: "center" | "left";
}) {
  const alignment = align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl";
  return (
    <Reveal className={alignment}>
      {kicker ? (
        <span className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-accent">
          {kicker}
        </span>
      ) : null}
      <h2 className="mt-4 font-display text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
        {title}
      </h2>
      {subtitle ? <p className="mt-4 text-lg text-muted-foreground">{subtitle}</p> : null}
    </Reveal>
  );
}
