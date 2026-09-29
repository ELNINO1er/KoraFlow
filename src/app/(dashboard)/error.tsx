"use client";

import { useEffect } from "react";
import { ErrorState } from "@/components/app/error-state";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Journalisation côté client (sans exposer de détail sensible à l'écran).
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl py-10">
      <ErrorState
        title="Impossible d'afficher cette page"
        description="Une erreur est survenue de notre côté. Réessayez ; si le problème persiste, revenez un peu plus tard."
        onRetry={reset}
      />
    </div>
  );
}
