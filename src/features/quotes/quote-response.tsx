"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { respondToQuoteAction } from "@/features/quotes/public-actions";
import { Button } from "@/components/ui/button";

/** Boutons d'acceptation / refus du devis par le client (portail public). */
export function QuoteResponse({ token }: { token: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function respond(decision: "ACCEPTED" | "REJECTED") {
    setError(null);
    startTransition(async () => {
      const result = await respondToQuoteAction(token, decision);
      if (!result.ok) {
        setError(result.error ?? "Action impossible.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button
          type="button"
          className="flex-1"
          disabled={pending}
          onClick={() => respond("ACCEPTED")}
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Accepter le devis
        </Button>
        <Button
          type="button"
          variant="outline"
          className="flex-1 text-danger hover:bg-danger/10"
          disabled={pending}
          onClick={() => respond("REJECTED")}
        >
          <X className="size-4" />
          Refuser
        </Button>
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
