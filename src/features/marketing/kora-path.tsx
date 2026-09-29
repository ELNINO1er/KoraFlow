"use client";

import { motion, useScroll, useSpring, useTransform } from "motion/react";
import { useMotionPref } from "./motion-preferences";

/**
 * « Le flux Kora » — un fil lumineux terracotta qui se dessine à mesure que le
 * visiteur défile, avec une tête lumineuse qui progresse. Purement décoratif,
 * en arrière-plan, sur le bord gauche. Sous mouvement réduit : fil statique.
 */
export function KoraFlowPath() {
  const { reduced } = useMotionPref();
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 55, damping: 20, mass: 0.4 });
  const headTop = useTransform(progress, [0, 1], ["0%", "100%"]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-y-0 left-4 z-30 hidden w-6 sm:block lg:left-8"
    >
      <svg className="h-full w-full" viewBox="0 0 24 100" preserveAspectRatio="none" fill="none">
        <defs>
          <linearGradient id="kf-flux" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent)" stopOpacity="0.05" />
            <stop offset="50%" stopColor="var(--color-accent)" stopOpacity="0.55" />
            <stop offset="100%" stopColor="var(--color-accent)" stopOpacity="0.05" />
          </linearGradient>
        </defs>

        {/* Rail discret */}
        <path
          d="M12 0 C 4 20, 20 34, 12 50 S 4 80, 12 100"
          stroke="var(--color-border)"
          strokeWidth="0.5"
          strokeOpacity="0.6"
        />
        {/* Fil dessiné au scroll */}
        <motion.path
          d="M12 0 C 4 20, 20 34, 12 50 S 4 80, 12 100"
          stroke="url(#kf-flux)"
          strokeWidth="1.4"
          strokeLinecap="round"
          style={{ pathLength: reduced ? 1 : progress }}
        />
      </svg>

      {/* Tête lumineuse qui suit la progression verticale */}
      {reduced ? null : (
        <motion.span
          className="absolute left-1/2 h-3 w-3 -translate-x-1/2 rounded-full bg-accent shadow-[0_0_16px_4px_var(--color-accent)]"
          style={{ top: headTop }}
        />
      )}
    </div>
  );
}
