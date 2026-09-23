"use client";

import { useState, useTransition } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
import type { FormFieldType } from "@prisma/client";
import { submitFormAction } from "@/features/forms/public-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export interface PublicField {
  id: string;
  label: string;
  type: FormFieldType;
  required: boolean;
  placeholder: string | null;
  options: string[];
}

const inputType: Partial<Record<FormFieldType, string>> = {
  EMAIL: "email",
  PHONE: "tel",
  NUMBER: "number",
  DATE: "date",
};

export function PublicForm({ slug, fields }: { slug: string; fields: PublicField[] }) {
  const [values, setValues] = useState<Record<string, string>>({});
  const [honeypot, setHoneypot] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  function set(id: string, v: string) {
    setValues((prev) => ({ ...prev, [id]: v }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const result = await submitFormAction(slug, values, honeypot);
      if (!result.ok) {
        setError(result.error ?? "Envoi impossible.");
        return;
      }
      setDone(true);
    });
  }

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 py-6 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
          <CheckCircle2 className="size-6" />
        </span>
        <h2 className="font-display text-lg font-semibold text-foreground">Merci !</h2>
        <p className="text-sm text-muted-foreground">
          Votre demande a bien été envoyée. Nous vous recontacterons rapidement.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      {fields.map((f) => (
        <div key={f.id} className="flex flex-col gap-1.5">
          {f.type !== "CONSENT" ? (
            <Label htmlFor={f.id}>
              {f.label}
              {f.required ? <span className="text-danger"> *</span> : null}
            </Label>
          ) : null}

          {f.type === "TEXTAREA" ? (
            <Textarea id={f.id} required={f.required} placeholder={f.placeholder ?? undefined} value={values[f.id] ?? ""} onChange={(e) => set(f.id, e.target.value)} />
          ) : f.type === "SELECT" ? (
            <select
              id={f.id}
              required={f.required}
              value={values[f.id] ?? ""}
              onChange={(e) => set(f.id, e.target.value)}
              className="h-10 rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <option value="">— Sélectionner —</option>
              {f.options.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          ) : f.type === "CONSENT" ? (
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="checkbox"
                required={f.required}
                checked={(values[f.id] ?? "") === "oui"}
                onChange={(e) => set(f.id, e.target.checked ? "oui" : "")}
                className="mt-0.5 size-4 rounded border-input accent-[color:var(--color-primary)]"
              />
              <span>{f.label}</span>
            </label>
          ) : (
            <Input id={f.id} type={inputType[f.type] ?? "text"} required={f.required} placeholder={f.placeholder ?? undefined} value={values[f.id] ?? ""} onChange={(e) => set(f.id, e.target.value)} />
          )}
        </div>
      ))}

      {/* Honeypot anti-spam (masqué aux humains). */}
      <input
        type="text"
        name="_website"
        tabIndex={-1}
        autoComplete="off"
        value={honeypot}
        onChange={(e) => setHoneypot(e.target.value)}
        className="absolute left-[-9999px] h-0 w-0 opacity-0"
        aria-hidden="true"
      />

      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : null}
        Envoyer
      </Button>
    </form>
  );
}
