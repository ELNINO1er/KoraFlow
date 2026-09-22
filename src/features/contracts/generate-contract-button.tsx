"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSignature, Loader2 } from "lucide-react";
import { generateContractAction } from "@/features/contracts/actions";
import { Button } from "@/components/ui/button";

export function GenerateContractButton({ quoteId }: { quoteId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await generateContractAction(quoteId);
      if (!result.ok) {
        setError(result.error ?? "Génération impossible.");
        return;
      }
      router.push(`/contrats/${result.contractId}`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button type="button" size="sm" variant="outline" onClick={generate} disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <FileSignature className="size-4" />}
        Générer le contrat
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
