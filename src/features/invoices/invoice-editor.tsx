"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2 } from "lucide-react";
import type { AmountKind } from "@/lib/quotes/totals";
import { computeQuoteTotals } from "@/lib/quotes/totals";
import { formatCurrency } from "@/lib/formatting/currency";
import { updateInvoiceAction } from "./actions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/ui/form-select";

type Line = { key: string; serviceId?: string | null; description: string; unitPriceMinor: number; quantity: number; taxRate: number };

export function InvoiceEditor({ invoice, locale, minorUnits, defaultColor }: {
  invoice: { id: string; number: string; currency: string; dueDate: string; notes: string; headerColor: string; footerColor: string; footerText: string; discountType: AmountKind | null; discountValue: number; depositType: AmountKind | null; depositValue: number; items: Line[] };
  locale: string;
  minorUnits: number;
  defaultColor: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [lines, setLines] = useState(invoice.items);
  const [dueDate, setDueDate] = useState(invoice.dueDate);
  const [notes, setNotes] = useState(invoice.notes);
  const [headerColor, setHeaderColor] = useState(invoice.headerColor || defaultColor);
  const [footerColor, setFooterColor] = useState(invoice.footerColor || defaultColor);
  const [footerText, setFooterText] = useState(invoice.footerText);
  const [discountType, setDiscountType] = useState<AmountKind | "">(invoice.discountType ?? "");
  const [discountValue, setDiscountValue] = useState(invoice.discountValue);
  const [depositType, setDepositType] = useState<AmountKind | "">(invoice.depositType ?? "");
  const [depositValue, setDepositValue] = useState(invoice.depositValue);
  const scale = 10 ** minorUnits;
  const money = (value: number) => formatCurrency(value, invoice.currency, locale);
  const totals = useMemo(() => computeQuoteTotals({ lines, discountType: discountType || null, discountValue, depositType: depositType || null, depositValue }), [lines, discountType, discountValue, depositType, depositValue]);
  const updateLine = (key: string, patch: Partial<Line>) => setLines((all) => all.map((line) => line.key === key ? { ...line, ...patch } : line));

  function submit() {
    setError(null);
    startTransition(async () => {
      const result = await updateInvoiceAction(invoice.id, { dueDate: dueDate || null, notes: notes || null, headerColor, footerColor, footerText: footerText || null, discountType: discountType || null, discountValue, depositType: depositType || null, depositValue, items: lines });
      if (!result.ok) return setError(result.error ?? "Impossible d’enregistrer la facture.");
      router.push(`/factures/${invoice.id}`);
      router.refresh();
    });
  }

  return <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
    <div className="flex min-w-0 flex-col gap-6">
      {error ? <p role="alert" className="rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger">{error}</p> : null}
      <Card><CardHeader className="flex-row items-center justify-between gap-3"><CardTitle>Tableau des prestations</CardTitle><Button type="button" size="sm" variant="outline" onClick={() => setLines((all) => [...all, { key: crypto.randomUUID(), description: "", unitPriceMinor: 0, quantity: 1, taxRate: 0 }])}><Plus className="size-4" />Ajouter une ligne</Button></CardHeader>
        <CardContent className="flex flex-col gap-3">{lines.map((line) => <div key={line.key} className="grid items-end gap-3 rounded-xl border border-border p-3 md:grid-cols-[minmax(12rem,1fr)_5rem_8rem_6rem_2.5rem]">
          <Field label="Description"><Input value={line.description} onChange={(e) => updateLine(line.key, { description: e.target.value })} /></Field>
          <Field label="Qté"><Input type="number" min={1} value={line.quantity} onChange={(e) => updateLine(line.key, { quantity: Math.max(1, Math.round(Number(e.target.value) || 1)) })} /></Field>
          <Field label={`P.U. HT (${invoice.currency})`}><Input type="number" min={0} step={1 / scale} value={line.unitPriceMinor / scale} onChange={(e) => updateLine(line.key, { unitPriceMinor: Math.round(Math.max(0, Number(e.target.value) || 0) * scale) })} /></Field>
          <Field label="TVA %"><Input type="number" min={0} max={100} value={line.taxRate} onChange={(e) => updateLine(line.key, { taxRate: Math.min(100, Math.max(0, Math.round(Number(e.target.value) || 0))) })} /></Field>
          <Button type="button" size="icon" variant="ghost" aria-label="Supprimer la ligne" disabled={lines.length === 1} onClick={() => setLines((all) => all.filter((item) => item.key !== line.key))} className="text-danger"><Trash2 className="size-4" /></Button>
        </div>)}</CardContent></Card>
      <Card><CardHeader><CardTitle>Présentation du PDF</CardTitle></CardHeader><CardContent className="grid gap-5 sm:grid-cols-2">
        <Field label="Couleur d’en-tête"><div className="flex gap-2"><Input type="color" value={headerColor} onChange={(e) => setHeaderColor(e.target.value)} className="w-14 p-1" /><Input value={headerColor} onChange={(e) => setHeaderColor(e.target.value)} /></div></Field>
        <Field label="Couleur du pied de page"><div className="flex gap-2"><Input type="color" value={footerColor} onChange={(e) => setFooterColor(e.target.value)} className="w-14 p-1" /><Input value={footerColor} onChange={(e) => setFooterColor(e.target.value)} /></div></Field>
        <div className="sm:col-span-2"><Field label="Texte du pied de page"><Input maxLength={240} value={footerText} onChange={(e) => setFooterText(e.target.value)} placeholder="Merci pour votre confiance." /></Field></div>
        <p className="sm:col-span-2 text-sm text-muted-foreground">Le logo configuré dans les <Link href="/parametres" className="font-medium text-foreground underline underline-offset-4">paramètres de l’entreprise</Link> est automatiquement intégré au PDF.</p>
      </CardContent></Card>
      <Card><CardHeader><CardTitle>Échéance et notes</CardTitle></CardHeader><CardContent className="grid gap-4 sm:grid-cols-2"><Field label="Date d’échéance"><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></Field><div className="sm:col-span-2"><Field label="Notes"><Textarea rows={4} value={notes} onChange={(e) => setNotes(e.target.value)} /></Field></div></CardContent></Card>
    </div>
    <aside className="xl:sticky xl:top-0 xl:self-start"><Card><CardHeader><CardTitle>Calculs vérifiés</CardTitle></CardHeader><CardContent className="flex flex-col gap-4">
      <MoneyOptions label="Remise" currency={invoice.currency} type={discountType} value={discountValue} scale={scale} onType={setDiscountType} onValue={setDiscountValue} />
      <MoneyOptions label="Acompte" currency={invoice.currency} type={depositType} value={depositValue} scale={scale} onType={setDepositType} onValue={setDepositValue} />
      <div className="border-t border-border pt-4 text-sm"><Row label="Sous-total HT" value={money(totals.subtotalMinor)} /><Row label="Remise" value={`− ${money(totals.discountMinor)}`} /><Row label="TVA" value={money(totals.taxMinor)} /><Row label="Total TTC" value={money(totals.totalMinor)} strong /><Row label="Reste après acompte" value={money(totals.remainingMinor)} /></div>
      <div className="flex gap-2"><Button asChild variant="outline" className="flex-1"><Link href={`/factures/${invoice.id}`}>Annuler</Link></Button><Button type="button" className="flex-1" disabled={pending || lines.length === 0} onClick={submit}>{pending ? <Loader2 className="size-4 animate-spin" /> : null}Enregistrer</Button></div>
    </CardContent></Card></aside>
  </div>;
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="flex min-w-0 flex-col gap-1.5"><span className="text-xs font-medium text-muted-foreground">{label}</span>{children}</label>; }
function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) { return <div className="flex justify-between gap-4 py-1.5"><span className="text-muted-foreground">{label}</span><span className={strong ? "font-bold" : "font-medium"}>{value}</span></div>; }
function MoneyOptions({ label, currency, type, value, scale, onType, onValue }: { label: string; currency: string; type: AmountKind | ""; value: number; scale: number; onType: (value: AmountKind | "") => void; onValue: (value: number) => void }) { const display = type === "AMOUNT" ? value / scale : value; return <div className="grid grid-cols-2 gap-2"><Field label={label}><FormSelect value={type || "NONE"} onValueChange={(v) => onType(v === "NONE" ? "" : v as AmountKind)} options={[{ value: "NONE", label: "Aucun" }, { value: "PERCENT", label: "%" }, { value: "AMOUNT", label: currency }]} /></Field><Field label="Valeur"><Input type="number" min={0} disabled={!type} value={display} onChange={(e) => onValue(Math.round(Math.max(0, Number(e.target.value) || 0) * (type === "AMOUNT" ? scale : 1)))} /></Field></div>; }
