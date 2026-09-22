"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ReceiptText, Loader2 } from "lucide-react";
import { generateInvoiceAction } from "@/features/invoices/actions";
import { Button } from "@/components/ui/button";

export function GenerateInvoiceButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await generateInvoiceAction(quoteId);
            if (!result.ok) {
              setError(result.error ?? "Génération impossible.");
              return;
            }
            router.push(`/factures/${result.invoiceId}`);
            router.refresh();
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <ReceiptText className="size-4" />}
        Générer la facture
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
