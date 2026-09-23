"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Loader2 } from "lucide-react";
import type { FormFieldType } from "@prisma/client";
import { FIELD_TYPES, fieldTypeLabel } from "@/lib/constants/forms";
import { addFieldAction, deleteFieldAction } from "@/features/forms/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export interface BuilderField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
}

const selectClass =
  "h-10 rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function FieldBuilder({
  formId,
  fields,
  canEdit,
}: {
  formId: string;
  fields: BuilderField[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [label, setLabel] = useState("");
  const [type, setType] = useState<FormFieldType>("TEXT");
  const [required, setRequired] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (label.trim().length < 1) return;
    startTransition(async () => {
      const result = await addFieldAction({ formId, label: label.trim(), type, required });
      if (!result.ok) {
        setError(result.error ?? "Ajout impossible.");
        return;
      }
      setLabel("");
      setRequired(false);
      router.refresh();
    });
  }

  function remove(fieldId: string) {
    startTransition(async () => {
      await deleteFieldAction(fieldId, formId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      {fields.length === 0 ? (
        <p className="text-sm text-muted-foreground">Aucun champ pour l’instant.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {fields.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-lg border border-border px-3 py-2">
              <div className="flex-1">
                <span className="text-sm font-medium text-foreground">{f.label}</span>
                {f.required ? <span className="ml-1 text-danger">*</span> : null}
                <span className="ml-2 text-xs text-muted-foreground">{fieldTypeLabel(f.type)}</span>
              </div>
              {canEdit ? (
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  className="text-danger hover:bg-danger/10"
                  disabled={pending}
                  onClick={() => remove(f.id)}
                  aria-label="Supprimer le champ"
                >
                  <Trash2 className="size-4" />
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {canEdit ? (
        <form onSubmit={add} className="flex flex-col gap-2 rounded-lg border border-dashed border-border p-3 sm:flex-row sm:items-center">
          <Input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Libellé du champ" className="flex-1" />
          <select value={type} onChange={(e) => setType(e.target.value as FormFieldType)} className={selectClass}>
            {FIELD_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
          <label className="flex items-center gap-1.5 text-sm text-foreground">
            <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="size-4 rounded border-input accent-[color:var(--color-primary)]" />
            Requis
          </label>
          <Button type="submit" disabled={pending || label.trim().length < 1}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
            Ajouter
          </Button>
        </form>
      ) : null}
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
