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
import { OrganizationBrand } from "@/components/brand/organization-brand";

export function ContractEditor({ contract }: { contract: { id: string; number: string; title: string; content: string; clientName: string; organization: { id: string; name: string; hasLogo: boolean } } }) {
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
    <Card className="xl:sticky xl:top-0 xl:self-start"><CardHeader><CardTitle>Aperçu du document</CardTitle></CardHeader><CardContent><article className="overflow-hidden rounded-xl border border-[#dde3ea] bg-white text-[#12263a] shadow-sm"><header className="flex items-start justify-between gap-4 border-b border-[#e4e7ec] p-6"><OrganizationBrand id={contract.organization.id} name={contract.organization.name} hasLogo={contract.organization.hasLogo} className="text-[#12263a]" /><div className="text-right"><p className="text-xs font-bold uppercase tracking-[0.16em]">Contrat</p><p className="mt-1 text-[11px] text-[#667085]">{contract.number}</p></div></header><div className="p-6"><p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[#667085]">Entre {contract.organization.name} et {contract.clientName}</p><h2 className="mb-6 font-display text-xl font-bold">{title || "Titre du contrat"}</h2><div className="whitespace-pre-wrap text-sm leading-7">{content || "Le contenu apparaîtra ici."}</div></div><footer className="border-t border-[#e4e7ec] bg-[#f8fafc] px-6 py-3 text-center text-[10px] text-[#667085]">Document à relire avant envoi et signature</footer></article></CardContent></Card>
  </div>;
}
