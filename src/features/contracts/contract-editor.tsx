"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, AlertTriangle, FileText } from "lucide-react";
import { updateContractAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { OrganizationBrand } from "@/components/brand/organization-brand";
import { CONTRACT_CLAUSES, CLAUSE_GROUPS } from "@/lib/contracts/clauses";
import { collectUnsupportedCharacters } from "@/lib/pdf/winansi";

const MAX = 30000;

export function ContractEditor({ contract }: { contract: { id: string; number: string; title: string; content: string; clientName: string; organization: { id: string; name: string; hasLogo: boolean } } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(contract.title);
  const [content, setContent] = useState(contract.content);
  const [error, setError] = useState<string | null>(null);
  const bodyRef = useRef<HTMLTextAreaElement>(null);

  const words = useMemo(() => content.trim().split(/\s+/).filter(Boolean).length, [content]);
  const unsupported = useMemo(() => collectUnsupportedCharacters([title, content]), [title, content]);
  const previewBlocks = useMemo(() => content.split(/\n{2,}/), [content]);

  function insertClause(body: string) {
    const el = bodyRef.current;
    const snippet = (content.trim() ? "\n\n" : "") + body;
    if (!el) {
      setContent((c) => (c + snippet).slice(0, MAX));
      return;
    }
    const start = el.selectionStart ?? content.length;
    const end = el.selectionEnd ?? content.length;
    const insert = (start === 0 && end === 0 && !content.trim()) ? body : (content.slice(Math.max(0, start - 2), start).includes("\n\n") ? "" : "\n\n") + body;
    const next = (content.slice(0, start) + insert + content.slice(end)).slice(0, MAX);
    setContent(next);
    requestAnimationFrame(() => {
      el.focus();
      const pos = Math.min(next.length, start + insert.length);
      el.selectionStart = el.selectionEnd = pos;
    });
  }

  function submit() {
    setError(null);
    if (unsupported.length) {
      setError(`Caractères non pris en charge par le PDF : ${unsupported.slice(0, 15).join(" ")}. Remplacez-les avant d'enregistrer.`);
      return;
    }
    startTransition(async () => {
      const result = await updateContractAction(contract.id, { title, content });
      if (!result.ok) return setError(result.error ?? "Impossible d’enregistrer le contrat.");
      router.push(`/contrats/${contract.id}`);
      router.refresh();
    });
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,0.85fr)]">
      <Card>
        <CardHeader><CardTitle>Rédaction du contrat</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-5">
          {error ? <p role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contract-title">Titre du document</Label>
            <Input id="contract-title" maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {/* Bibliothèque de clauses — insertion au curseur */}
          <div className="flex flex-col gap-2 rounded-lg border border-border bg-muted/30 p-3">
            <div className="flex items-center gap-2 text-sm font-medium text-foreground">
              <FileText className="size-4 text-accent" />
              Insérer une clause type
            </div>
            <div className="flex flex-col gap-2">
              {CLAUSE_GROUPS.map((group) => (
                <div key={group} className="flex flex-wrap items-center gap-1.5">
                  <span className="w-28 shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">{group}</span>
                  {CONTRACT_CLAUSES.filter((c) => c.group === group).map((c) => (
                    <button
                      key={c.key}
                      type="button"
                      onClick={() => insertClause(c.body)}
                      className="inline-flex items-center gap-1 rounded-md border border-border bg-surface px-2 py-1 text-xs text-foreground transition-colors hover:bg-muted"
                    >
                      <Plus className="size-3" />{c.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>
            <p className="text-xs text-muted-foreground">Clauses types à relire et adapter — elles ne garantissent pas la validité juridique.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="contract-content">Contenu contractuel</Label>
              <span className="text-xs text-muted-foreground">{words.toLocaleString("fr-FR")} mots · {content.length.toLocaleString("fr-FR")} / {MAX.toLocaleString("fr-FR")}</span>
            </div>
            <Textarea id="contract-content" ref={bodyRef} rows={24} maxLength={MAX} value={content} onChange={(e) => setContent(e.target.value)} className="resize-y font-mono leading-6" aria-describedby="contract-help" />
            <p id="contract-help" className="text-xs text-muted-foreground">Séparez les articles par une ligne vide. Le texte enregistré est exactement celui présenté au client et intégré au PDF.</p>
            {unsupported.length ? (
              <p className="flex items-center gap-2 rounded-md bg-warning/10 px-3 py-2 text-xs text-warning">
                <AlertTriangle className="size-4 shrink-0" />
                Caractères non pris en charge par le PDF : <span className="font-mono">{unsupported.slice(0, 20).join(" ")}</span>
              </p>
            ) : null}
          </div>

          <div className="flex justify-end gap-2">
            <Button asChild variant="outline"><Link href={`/contrats/${contract.id}`}>Annuler</Link></Button>
            <Button type="button" onClick={submit} disabled={pending || content.trim().length < 40}>
              {pending ? <Loader2 className="size-4 animate-spin" /> : null}Enregistrer le brouillon
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="xl:sticky xl:top-0 xl:self-start">
        <CardHeader><CardTitle>Aperçu du document</CardTitle></CardHeader>
        <CardContent>
          <article className="overflow-hidden rounded-xl border border-[#dde3ea] bg-white text-[#12263a] shadow-sm">
            <header className="flex items-start justify-between gap-4 border-b border-[#e4e7ec] p-6">
              <OrganizationBrand id={contract.organization.id} name={contract.organization.name} hasLogo={contract.organization.hasLogo} className="text-[#12263a]" />
              <div className="text-right"><p className="text-xs font-bold uppercase tracking-[0.16em]">Contrat</p><p className="mt-1 text-[11px] text-[#667085]">{contract.number}</p></div>
            </header>
            <div className="max-h-[32rem] overflow-y-auto p-6">
              <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#667085]">Entre {contract.organization.name} et {contract.clientName}</p>
              <h2 className="mb-6 font-display text-xl font-bold">{title || "Titre du contrat"}</h2>
              {content.trim() ? (
                <div className="flex flex-col gap-4 text-sm leading-7">
                  {previewBlocks.map((block, i) => {
                    const lines = block.split("\n");
                    const isArticle = /^ARTICLE\b/i.test(lines[0] ?? "");
                    if (isArticle) {
                      return (
                        <div key={i}>
                          <p className="font-semibold uppercase tracking-wide text-[#12263a]">{lines[0]}</p>
                          {lines.length > 1 ? <p className="mt-1 whitespace-pre-wrap text-[#30425a]">{lines.slice(1).join("\n")}</p> : null}
                        </div>
                      );
                    }
                    return <p key={i} className="whitespace-pre-wrap text-[#30425a]">{block}</p>;
                  })}
                </div>
              ) : (
                <p className="text-sm text-[#98a2b3]">Le contenu apparaîtra ici.</p>
              )}
            </div>
            <footer className="border-t border-[#e4e7ec] bg-[#f8fafc] px-6 py-3 text-center text-[10px] text-[#667085]">Document à relire avant envoi et signature</footer>
          </article>
        </CardContent>
      </Card>
    </div>
  );
}
