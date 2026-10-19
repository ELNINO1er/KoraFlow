"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSignature, Loader2 } from "lucide-react";
import { generateContractAction } from "@/features/contracts/actions";
import { Button } from "@/components/ui/button";

export function GenerateContractButton({
  quoteId,
  templates = [],
}: {
  quoteId: string;
  templates?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [templateId, setTemplateId] = useState("");

  function generate() {
    setError(null);
    startTransition(async () => {
      const result = await generateContractAction(quoteId, templateId || null);
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
      <div className="flex items-center gap-2">
        {templates.length > 0 ? (
          <select
            value={templateId}
            onChange={(e) => setTemplateId(e.target.value)}
            className="rounded-md border border-input bg-surface px-2 py-1.5 text-sm text-foreground"
            aria-label="Modèle de contrat"
          >
            <option value="">Modèle par défaut</option>
            {templates.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        ) : null}
        <Button type="button" size="sm" variant="outline" onClick={generate} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <FileSignature className="size-4" />}
          Générer le contrat
        </Button>
      </div>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
