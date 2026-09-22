"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import type { QuoteStatus } from "@prisma/client";
import { QUOTE_STATUSES } from "@/lib/constants/quotes";
import { changeQuoteStatusAction, deleteQuoteAction } from "@/features/quotes/actions";
import { Button } from "@/components/ui/button";

export function QuoteStatusControl({
  id,
  current,
}: {
  id: string;
  current: QuoteStatus;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <select
      value={current}
      disabled={pending}
      onChange={(e) => {
        const next = e.target.value as QuoteStatus;
        if (next === current) return;
        startTransition(async () => {
          await changeQuoteStatusAction(id, next);
          router.refresh();
        });
      }}
      className="h-9 rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
    >
      {QUOTE_STATUSES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}

export function QuoteDeleteButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="text-danger hover:bg-danger/10"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Supprimer ce devis ?")) return;
        startTransition(async () => {
          await deleteQuoteAction(id);
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      Supprimer
    </Button>
  );
}
