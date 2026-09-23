"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, X, Loader2 } from "lucide-react";
import { confirmPaymentAction, rejectPaymentAction } from "@/features/payments/actions";
import { Button } from "@/components/ui/button";

/** Boutons Valider / Rejeter pour un paiement en attente (responsable). */
export function PaymentValidation({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function act(kind: "confirm" | "reject") {
    setError(null);
    startTransition(async () => {
      const result =
        kind === "confirm"
          ? await confirmPaymentAction(id)
          : await rejectPaymentAction(id);
      if (!result.ok) {
        setError(result.error ?? "Action impossible.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex gap-2">
        <Button type="button" size="sm" disabled={pending} onClick={() => act("confirm")}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
          Valider
        </Button>
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="text-danger hover:bg-danger/10"
          disabled={pending}
          onClick={() => act("reject")}
        >
          <X className="size-4" />
          Rejeter
        </Button>
      </div>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
