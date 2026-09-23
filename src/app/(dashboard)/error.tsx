"use client";

import { useEffect } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-2xl">
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-danger/10 text-danger">
          <AlertTriangle className="size-6" />
        </span>
        <p className="font-display text-lg font-semibold text-foreground">Une erreur est survenue</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Impossible de charger cette page. Réessayez.
        </p>
        <Button type="button" onClick={reset} className="mt-2">
          Réessayer
        </Button>
      </Card>
    </div>
  );
}
