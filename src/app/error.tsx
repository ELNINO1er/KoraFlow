"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Journalisation côté client (aucune donnée sensible exposée à l'utilisateur).
    console.error(error);
  }, [error]);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-danger/10 text-danger">
        <AlertTriangle className="size-7" />
      </span>
      <h1 className="font-display text-2xl font-bold text-foreground">Une erreur est survenue</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        Quelque chose s’est mal passé de notre côté. Vous pouvez réessayer ; si le
        problème persiste, contactez le support.
      </p>
      {error.digest ? (
        <p className="text-xs text-muted-foreground">Référence : {error.digest}</p>
      ) : null}
      <Button type="button" onClick={reset}>
        Réessayer
      </Button>
    </main>
  );
}
