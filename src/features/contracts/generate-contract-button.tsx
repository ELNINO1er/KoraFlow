"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSignature, Loader2 } from "lucide-react";
import { generateContractAction } from "@/features/contracts/actions";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";

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
          <FormSelect
            value={templateId}
            onValueChange={setTemplateId}
            aria-label="Modèle de contrat"
            options={[{ value: "", label: "Modèle par défaut" }, ...templates.map((t) => ({ value: t.id, label: t.name }))]}
            className="h-9 w-auto min-w-48"
          />
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
