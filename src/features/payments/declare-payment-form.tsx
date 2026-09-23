"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import type { PaymentMethod } from "@prisma/client";
import { PAYMENT_METHODS } from "@/lib/constants/invoices";
import { declarePaymentAction } from "@/features/payments/public-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const selectClass =
  "flex h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

/** Formulaire public de déclaration de paiement (portail client). */
export function DeclarePaymentForm({
  token,
  currency,
  minorUnits,
  suggestedMajor,
}: {
  token: string;
  currency: string;
  minorUnits: number;
  suggestedMajor: number;
}) {
  const router = useRouter();
  const [amount, setAmount] = useState(suggestedMajor);
  const [method, setMethod] = useState<PaymentMethod>("WAVE");
  const [reference, setReference] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    const amountMinor = Math.round(amount * 10 ** minorUnits);
    if (amountMinor <= 0) {
      setError("Montant invalide.");
      return;
    }
    startTransition(async () => {
      const result = await declarePaymentAction(token, {
        amountMinor,
        method,
        reference: reference.trim() || undefined,
      });
      if (!result.ok) {
        setError(result.error ?? "Déclaration impossible.");
        return;
      }
      setDone(true);
      router.refresh();
    });
  }

  if (done) {
    return (
      <p className="rounded-lg bg-success/10 px-4 py-3 text-sm text-success">
        Merci ! Votre paiement a été déclaré. Il sera validé par le prestataire
        après vérification.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="amount">Montant ({currency})</Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(Math.max(0, Number(e.target.value) || 0))}
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="method">Moyen de paiement</Label>
          <select
            id="method"
            value={method}
            onChange={(e) => setMethod(e.target.value as PaymentMethod)}
            className={selectClass}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m.value} value={m.value}>
                {m.label}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="reference">Référence de la transaction (facultatif)</Label>
        <Input
          id="reference"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Ex. identifiant Wave / Orange Money"
        />
      </div>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Déclarer mon paiement
      </Button>
    </form>
  );
}
