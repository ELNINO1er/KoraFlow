"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2, Loader2, Check } from "lucide-react";
import type { InvoiceStatus } from "@prisma/client";
import { INVOICE_STATUSES } from "@/lib/constants/invoices";
import {
  sendInvoiceAction,
  deleteInvoiceAction,
  changeInvoiceStatusAction,
} from "@/features/invoices/actions";
import { Button } from "@/components/ui/button";

export function SendInvoiceButton({ id, hasEmail }: { id: string; hasEmail: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        disabled={pending || !hasEmail}
        title={hasEmail ? undefined : "Le client n'a pas d'adresse e-mail"}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const r = await sendInvoiceAction(id);
            if (!r.ok) {
              setError(r.error ?? "Envoi impossible.");
              return;
            }
            setSent(true);
            router.refresh();
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : sent ? <Check className="size-4" /> : <Send className="size-4" />}
        {sent ? "Envoyée" : "Envoyer au client"}
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}

export function InvoiceStatusControl({ id, current }: { id: string; current: InvoiceStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <select
      value={current}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as InvoiceStatus;
        if (next === current) return;
        startTransition(async () => {
          await changeInvoiceStatusAction(id, next);
          router.refresh();
        });
      }}
      className="h-9 rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
    >
      {INVOICE_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

export function DeleteInvoiceButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="text-danger hover:bg-danger/10"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Supprimer cette facture ?")) return;
        startTransition(async () => {
          await deleteInvoiceAction(id);
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      Supprimer
    </Button>
  );
}
