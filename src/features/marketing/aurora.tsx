import { cn } from "@/lib/utils";

/**
 * Fond « aurore » décoratif : nappes de couleur floues qui dérivent lentement.
 * Purement CSS (transform/opacity), figé sous prefers-reduced-motion.
 */
export function Aurora({ className }: { className?: string }) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div className="kf-aurora-a absolute -left-10 -top-24 h-72 w-72 rounded-full bg-accent/25 blur-3xl sm:h-96 sm:w-96" />
      <div className="kf-aurora-b absolute right-0 top-4 h-80 w-80 rounded-full bg-accent/15 blur-3xl" />
      <div className="kf-aurora-c absolute -bottom-24 left-1/3 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
    </div>
  );
}
