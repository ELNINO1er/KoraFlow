"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { updateContractAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

export function ContractEditor({ contract }: { contract: { id: string; number: string; title: string; content: string } }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState(contract.title);
  const [content, setContent] = useState(contract.content);
  const [error, setError] = useState<string | null>(null);
  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await updateContractAction(contract.id, { title, content });
      if (!result.ok) return setError(result.error ?? "Impossible d’enregistrer le contrat.");
      router.push(`/contrats/${contract.id}`);
      router.refresh();
    });
  }
  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(20rem,0.8fr)]">
    <Card><CardHeader><CardTitle>Rédaction du contrat</CardTitle></CardHeader><CardContent className="flex flex-col gap-5">
      {error ? <p role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
      <div className="flex flex-col gap-1.5"><Label htmlFor="contract-title">Titre du document</Label><Input id="contract-title" maxLength={160} value={title} onChange={(e) => setTitle(e.target.value)} /></div>
      <div className="flex flex-col gap-1.5"><div className="flex items-center justify-between"><Label htmlFor="contract-content">Contenu contractuel</Label><span className="text-xs text-muted-foreground">{content.length.toLocaleString("fr-FR")} / 30 000</span></div><Textarea id="contract-content" rows={26} maxLength={30000} value={content} onChange={(e) => setContent(e.target.value)} className="resize-y font-mono leading-6" aria-describedby="contract-help" /><p id="contract-help" className="text-xs text-muted-foreground">Utilisez des lignes vides pour séparer les articles. Le texte enregistré sera exactement celui présenté au client et intégré au PDF.</p></div>
      <div className="flex justify-end gap-2"><Button asChild variant="outline"><Link href={`/contrats/${contract.id}`}>Annuler</Link></Button><Button type="button" onClick={submit} disabled={pending}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Enregistrer le brouillon</Button></div>
    </CardContent></Card>
    <Card className="xl:sticky xl:top-0 xl:self-start"><CardHeader><CardTitle>Aperçu aligné</CardTitle></CardHeader><CardContent><article className="rounded-xl border border-border bg-background p-6 shadow-sm"><p className="mb-6 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{contract.number}</p><h2 className="mb-6 font-display text-xl font-bold text-foreground">{title || "Titre du contrat"}</h2><div className="whitespace-pre-wrap text-sm leading-7 text-foreground">{content || "Le contenu apparaîtra ici."}</div></article></CardContent></Card>
  </div>;
}
