"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2, Loader2 } from "lucide-react";
import type { QuoteStatus } from "@prisma/client";
import { QUOTE_STATUSES } from "@/lib/constants/quotes";
import { changeQuoteStatusAction, deleteQuoteAction } from "@/features/quotes/actions";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";

export function QuoteStatusControl({
  id,
  current,
}: {
  id: string;
  current: QuoteStatus;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState<QuoteStatus>(current);

  return (
    <div className="flex min-w-36 flex-col gap-1">
      <Select
        value={value}
        disabled={pending}
        onValueChange={(next: QuoteStatus) => {
          if (next === value) return;
          const previous = value;
          setValue(next);
          startTransition(async () => {
            const result = await changeQuoteStatusAction(id, next);
            if (!result.ok) {
              setValue(previous);
              toast({ title: "Statut non modifié", description: result.error, variant: "danger" });
              return;
            }
            toast({ title: "Statut mis à jour", variant: "success" });
            router.refresh();
          });
        }}
      >
        <SelectTrigger className="h-9" aria-label="Statut du devis">
          <SelectValue />
        </SelectTrigger>
        <SelectContent align="end">
          {QUOTE_STATUSES.map((status) => (
            <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
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
