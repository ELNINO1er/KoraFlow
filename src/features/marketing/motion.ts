import type { Variants, Transition } from "motion/react";

/**
 * Vocabulaire de mouvement centralisé pour la landing (durées, courbes,
 * distances, variantes). Objectif : un langage d'animation cohérent, et un seul
 * endroit à ajuster.
 *
 * On n'anime que `opacity` et `transform` (GPU, 60fps).
 */

export const EASE_OUT = [0.16, 1, 0.3, 1] as const; // entrées
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const; // transitions d'état

export const DURATION = {
  fast: 0.2,
  base: 0.55,
  slow: 0.8,
} as const;

export const DISTANCE = 26; // translation d'entrée par défaut (px)

export const enter = (delay = 0, duration: number = DURATION.base): Transition => ({
  duration,
  ease: EASE_OUT,
  delay,
});

/** Variantes d'entrée — la transition est fournie via la prop `transition`. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: DISTANCE },
  show: { opacity: 1, y: 0 },
};

export const fadeDown: Variants = {
  hidden: { opacity: 0, y: -DISTANCE },
  show: { opacity: 1, y: 0 },
};

export const fadeLeft: Variants = {
  hidden: { opacity: 0, x: DISTANCE },
  show: { opacity: 1, x: 0 },
};

export const fadeRight: Variants = {
  hidden: { opacity: 0, x: -DISTANCE },
  show: { opacity: 1, x: 0 },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.92 },
  show: { opacity: 1, scale: 1 },
};

export const fade: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};

export const VARIANTS = {
  up: fadeUp,
  down: fadeDown,
  left: fadeLeft,
  right: fadeRight,
  scale: scaleIn,
  fade,
} as const;

export type RevealVariant = keyof typeof VARIANTS;
