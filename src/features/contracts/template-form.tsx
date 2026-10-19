"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CONTRACT_VARIABLES, resolveTemplate } from "@/lib/contracts/variables";
import { createTemplateAction, updateTemplateAction } from "@/features/contracts/template-actions";

/** Valeurs d'exemple pour l'aperçu (non persistées). */
const SAMPLE: Record<string, string> = {
  org_name: "Votre Entreprise",
  client_name: "Client Exemple SARL",
  quote_number: "DEV-2026-0001",
  total_ttc: "1 180 000 FCFA",
  date: "1 janvier 2026",
};

export function TemplateForm({
  template,
}: {
  template?: { id: string; name: string; body: string };
}) {
  const router = useRouter();
  const [name, setName] = useState(template?.name ?? "");
  const [body, setBody] = useState(template?.body ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const preview = useMemo(() => resolveTemplate(body, SAMPLE), [body]);

  function insertVariable(key: string) {
    const token = `{{${key}}}`;
    const el = bodyRef.current;
    if (!el) {
      setBody((b) => b + token);
      return;
    }
    const start = el.selectionStart ?? body.length;
    const end = el.selectionEnd ?? body.length;
    const next = body.slice(0, start) + token + body.slice(end);
    setBody(next);
    requestAnimationFrame(() => {
      el.focus();
      el.selectionStart = el.selectionEnd = start + token.length;
    });
  }

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = template
        ? await updateTemplateAction(template.id, { name, body })
        : await createTemplateAction({ name, body });
      if (!result.ok) {
        setError(result.error ?? "Enregistrement impossible.");
        return;
      }
      router.push("/contrats/modeles");
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tpl-name">Nom du modèle</Label>
          <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="Contrat de prestation standard" />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Variables disponibles</Label>
          <div className="flex flex-wrap gap-2">
            {CONTRACT_VARIABLES.map((v) => (
              <button
                key={v.key}
                type="button"
                onClick={() => insertVariable(v.key)}
                title={v.description}
                className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
              >
                <Plus className="size-3" />
                {v.label}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            Cliquez pour insérer une variable, ex. <code>{"{{client_name}}"}</code>. Seules ces variables sont autorisées.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="tpl-body">Corps du modèle</Label>
          <Textarea id="tpl-body" ref={bodyRef} rows={18} value={body} onChange={(e) => setBody(e.target.value)} className="font-mono text-xs" />
        </div>

        {preview.unknown.length > 0 ? (
          <p className="rounded-md bg-danger/10 px-3 py-2 text-sm text-danger">
            Variables inconnues : {preview.unknown.map((k) => `{{${k}}}`).join(", ")}. Elles seront refusées à l’enregistrement.
          </p>
        ) : null}
        {error ? <p className="text-sm text-danger">{error}</p> : null}

        <div className="flex justify-end">
          <Button type="button" onClick={submit} disabled={pending || name.trim().length < 3 || body.trim().length < 20}>
            {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
            {template ? "Enregistrer" : "Créer le modèle"}
          </Button>
        </div>
      </div>

      <Card className="h-fit lg:sticky lg:top-6">
        <CardHeader>
          <CardTitle className="text-base">Aperçu (données d’exemple)</CardTitle>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">{preview.text || "Le corps du modèle s’affichera ici."}</pre>
        </CardContent>
      </Card>
    </div>
  );
}
