"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { computeQuoteTotals, type AmountKind } from "@/lib/quotes/totals";
import { formatCurrency } from "@/lib/formatting/currency";
import { createQuoteAction, updateQuoteAction } from "@/features/quotes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FormSelect } from "@/components/ui/form-select";
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";

export interface ContactOption {
  id: string;
  label: string;
}
export interface ServiceOption {
  id: string;
  name: string;
  priceMinor: number;
  taxRate: number;
  unit: string;
}

interface Line {
  key: number;
  serviceId: string | null;
  description: string;
  unitPriceMajor: number;
  quantity: number;
  taxRate: number;
}

interface SectionItem { key: number; heading: string; body: string }

export interface QuoteInitial {
  id: string;
  contactLabel?: string;
  title?: string | null;
  introduction?: string | null;
  notes?: string | null;
  terms?: string | null;
  expiryDate?: string | null;
  discountType?: AmountKind | null;
  discountValue?: number;
  depositType?: AmountKind | null;
  depositValue?: number;
  sections?: { heading: string; body: string }[];
  items: { serviceId: string | null; description: string; unitPriceMajor: number; quantity: number; taxRate: number }[];
}

export function QuoteForm({
  contacts,
  services,
  currency,
  localeTag,
  minorUnits,
  quote,
}: {
  contacts: ContactOption[];
  services: ServiceOption[];
  currency: string;
  localeTag: string;
  minorUnits: number;
  /** Fourni en mode ÉDITION (brouillon) : préremplit le formulaire et bascule sur la mise à jour. */
  quote?: QuoteInitial;
}) {
  const router = useRouter();
  const isEdit = Boolean(quote);
  const keyRef = useRef(1000);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [contactId, setContactId] = useState("");
  const [lines, setLines] = useState<Line[]>(
    () => (quote?.items ?? []).map((it, i) => ({ key: i + 1, serviceId: it.serviceId, description: it.description, unitPriceMajor: it.unitPriceMajor, quantity: it.quantity, taxRate: it.taxRate })),
  );
  const [discountType, setDiscountType] = useState<"" | AmountKind>(quote?.discountType ?? "");
  const [discountValue, setDiscountValue] = useState(
    () => (quote?.discountType === "AMOUNT" ? (quote.discountValue ?? 0) / 10 ** minorUnits : quote?.discountValue ?? 0),
  );
  const [depositType, setDepositType] = useState<"" | AmountKind>(quote?.depositType ?? "");
  const [depositValue, setDepositValue] = useState(
    () => (quote?.depositType === "AMOUNT" ? (quote.depositValue ?? 0) / 10 ** minorUnits : quote?.depositValue ?? 0),
  );
  const [expiryDate, setExpiryDate] = useState(quote?.expiryDate ?? "");
  const [notes, setNotes] = useState(quote?.notes ?? "");
  const [terms, setTerms] = useState(quote?.terms ?? "");
  const [title, setTitle] = useState(quote?.title ?? "");
  const [introduction, setIntroduction] = useState(quote?.introduction ?? "");
  const [sections, setSections] = useState<SectionItem[]>(
    () => (quote?.sections ?? []).map((s, i) => ({ key: i + 1, heading: s.heading, body: s.body })),
  );

  const toMinor = (major: number) => Math.round(major * 10 ** minorUnits);
  const money = (minor: number) => formatCurrency(minor, currency, localeTag);

  const totals = computeQuoteTotals({
    lines: lines.map((l) => ({
      unitPriceMinor: toMinor(l.unitPriceMajor),
      quantity: l.quantity,
      taxRate: l.taxRate,
    })),
    discountType: discountType || null,
    discountValue: discountType === "AMOUNT" ? toMinor(discountValue) : discountValue,
    depositType: depositType || null,
    depositValue: depositType === "AMOUNT" ? toMinor(depositValue) : depositValue,
  });

  function addFreeLine() {
    setLines((prev) => [
      ...prev,
      { key: keyRef.current++, serviceId: null, description: "", unitPriceMajor: 0, quantity: 1, taxRate: 0 },
    ]);
  }

  function addServiceLine(serviceId: string) {
    const svc = services.find((s) => s.id === serviceId);
    if (!svc) return;
    setLines((prev) => [
      ...prev,
      {
        key: keyRef.current++,
        serviceId: svc.id,
        description: `${svc.name} (${svc.unit})`,
        unitPriceMajor: svc.priceMinor / 10 ** minorUnits,
        quantity: 1,
        taxRate: svc.taxRate,
      },
    ]);
  }

  function updateLine(key: number, patch: Partial<Line>) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, ...patch } : l)));
  }

  function removeLine(key: number) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function addSection() {
    setSections((prev) => [...prev, { key: keyRef.current++, heading: "", body: "" }]);
  }
  function updateSection(key: number, patch: Partial<SectionItem>) {
    setSections((prev) => prev.map((s) => (s.key === key ? { ...s, ...patch } : s)));
  }
  function removeSection(key: number) {
    setSections((prev) => prev.filter((s) => s.key !== key));
  }

  function submit() {
    setError(null);
    if (!isEdit && !contactId) {
      setError("Sélectionnez un client.");
      return;
    }
    if (lines.length === 0) {
      setError("Ajoutez au moins une ligne.");
      return;
    }
    const cleanSections = sections
      .map((s) => ({ heading: s.heading.trim(), body: s.body.trim() }))
      .filter((s) => s.heading && s.body);
    const common = {
      expiryDate: expiryDate || undefined,
      notes: notes || undefined,
      terms: terms || undefined,
      title: title || undefined,
      introduction: introduction || undefined,
      sections: cleanSections.length ? cleanSections : undefined,
      discountType: discountType || null,
      discountValue: discountType === "AMOUNT" ? toMinor(discountValue) : discountValue,
      depositType: depositType || null,
      depositValue: depositType === "AMOUNT" ? toMinor(depositValue) : depositValue,
      items: lines.map((l) => ({
        serviceId: l.serviceId,
        description: l.description,
        unitPriceMinor: toMinor(l.unitPriceMajor),
        quantity: l.quantity,
        taxRate: l.taxRate,
      })),
    };
    startTransition(async () => {
      if (isEdit && quote) {
        const result = await updateQuoteAction(quote.id, common);
        if (!result.ok) { setError(result.error ?? "Impossible d'enregistrer le devis."); return; }
        router.push(`/devis/${quote.id}`);
      } else {
        const result = await createQuoteAction({ contactId, ...common });
        if (!result.ok) { setError(result.error ?? "Impossible de créer le devis."); return; }
        router.push(`/devis/${result.quoteId}`);
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-6">
      {error ? (
        <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
          {error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Client &amp; échéance</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contact">Client *</Label>
            {isEdit ? (
              <p className="rounded-lg border border-input bg-muted/40 px-3 py-2 text-sm text-foreground">{quote?.contactLabel ?? "Client"}</p>
            ) : (
              <FormSelect
                id="contact"
                value={contactId}
                onValueChange={setContactId}
                placeholder="— Sélectionner —"
                options={contacts.map((c) => ({ value: c.id, label: c.label }))}
              />
            )}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="expiry">Date d’expiration</Label>
            <Input
              id="expiry"
              type="date"
              value={expiryDate}
              onChange={(e) => setExpiryDate(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Rédaction</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q-title">Objet</Label>
            <Input id="q-title" value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} placeholder="Ex. : Refonte du site vitrine" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="q-intro">Introduction / contexte</Label>
            <Textarea id="q-intro" rows={3} value={introduction} onChange={(e) => setIntroduction(e.target.value)} placeholder="Présentation du besoin et du contexte (facultatif)." />
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <Label>Sections (livrables, périmètre, exclusions, délais…)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addSection}><Plus className="size-4" />Ajouter une section</Button>
            </div>
            {sections.map((s) => (
              <div key={s.key} className="flex flex-col gap-1.5 rounded-lg border border-border p-3">
                <div className="flex items-center gap-2">
                  <Input value={s.heading} maxLength={160} onChange={(e) => updateSection(s.key, { heading: e.target.value })} placeholder="Titre de la section (ex. Livrables)" />
                  <Button type="button" variant="outline" size="sm" onClick={() => removeSection(s.key)}><Trash2 className="size-4" /></Button>
                </div>
                <Textarea rows={2} value={s.body} onChange={(e) => updateSection(s.key, { body: e.target.value })} placeholder="Contenu de la section" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Lignes</CardTitle>
          <div className="flex items-center gap-2">
            {services.length > 0 ? (
              <FormSelect
                value=""
                onValueChange={(v) => {
                  if (v) addServiceLine(v);
                }}
                placeholder="+ Depuis le catalogue"
                className="w-auto min-w-48"
                options={services.map((s) => ({
                  value: s.id,
                  label: `${s.name} — ${money(s.priceMinor)}`,
                }))}
              />
            ) : null}
            <Button type="button" variant="outline" size="sm" onClick={addFreeLine}>
              <Plus className="size-4" />
              Ligne libre
            </Button>
          </div>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {lines.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
              Aucune ligne. Ajoutez un service du catalogue ou une ligne libre.
            </p>
          ) : (
            lines.map((l) => (
              <div
                key={l.key}
                className="grid items-end gap-2 rounded-lg border border-border p-3 sm:grid-cols-[1fr_5rem_7rem_5rem_2.5rem]"
              >
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Description</Label>
                  <Input
                    value={l.description}
                    onChange={(e) => updateLine(l.key, { description: e.target.value })}
                    placeholder="Prestation…"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">Qté</Label>
                  <Input
                    type="number"
                    min="1"
                    value={l.quantity}
                    onChange={(e) => updateLine(l.key, { quantity: Math.max(1, Number(e.target.value) || 1) })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">P.U. HT</Label>
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    value={l.unitPriceMajor}
                    onChange={(e) => updateLine(l.key, { unitPriceMajor: Math.max(0, Number(e.target.value) || 0) })}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs">TVA %</Label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={l.taxRate}
                    onChange={(e) => updateLine(l.key, { taxRate: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })}
                  />
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label="Supprimer la ligne"
                  onClick={() => removeLine(l.key)}
                  className="text-danger hover:bg-danger/10"
                >
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Remise &amp; acompte</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Remise</Label>
                <FormSelect
                  value={discountType === "" ? "NONE" : discountType}
                  onValueChange={(v) => setDiscountType(v === "NONE" ? "" : (v as AmountKind))}
                  options={[
                    { value: "NONE", label: "Aucune" },
                    { value: "PERCENT", label: "Pourcentage (%)" },
                    { value: "AMOUNT", label: `Montant (${currency})` },
                  ]}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Valeur</Label>
                <Input
                  type="number"
                  min="0"
                  disabled={discountType === ""}
                  value={discountValue}
                  onChange={(e) => setDiscountValue(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Acompte</Label>
                <FormSelect
                  value={depositType === "" ? "NONE" : depositType}
                  onValueChange={(v) => setDepositType(v === "NONE" ? "" : (v as AmountKind))}
                  options={[
                    { value: "NONE", label: "Aucun" },
                    { value: "PERCENT", label: "Pourcentage (%)" },
                    { value: "AMOUNT", label: `Montant (${currency})` },
                  ]}
                />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs">Valeur</Label>
                <Input
                  type="number"
                  min="0"
                  disabled={depositType === ""}
                  value={depositValue}
                  onChange={(e) => setDepositValue(Math.max(0, Number(e.target.value) || 0))}
                />
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Message visible par le client (facultatif)." />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="terms">Conditions commerciales</Label>
              <Textarea id="terms" rows={3} value={terms} onChange={(e) => setTerms(e.target.value)} placeholder="Validité, modalités de paiement, acompte, délais, périmètre et exclusions…" />
              <p className="text-xs text-muted-foreground">Affichées dans le devis PDF, sous la rubrique « Conditions ».</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Récapitulatif</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2 text-sm">
            <Row label="Sous-total HT" value={money(totals.subtotalMinor)} />
            {totals.discountMinor > 0 ? (
              <Row label="Remise" value={`− ${money(totals.discountMinor)}`} />
            ) : null}
            <Row label="Total HT" value={money(totals.totalHtMinor)} />
            <Row label="TVA" value={money(totals.taxMinor)} />
            <div className="my-1 border-t border-border" />
            <Row label="Total TTC" value={money(totals.totalMinor)} strong />
            {totals.depositMinor > 0 ? (
              <>
                <Row label="Acompte demandé" value={money(totals.depositMinor)} />
                <Row label="Reste à payer" value={money(totals.remainingMinor)} />
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Aperçu du devis</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 text-sm">
          {title ? <p className="font-display text-lg font-bold text-foreground">{title}</p> : null}
          {introduction ? <p className="whitespace-pre-wrap text-muted-foreground">{introduction}</p> : null}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground">
                  <th className="py-1 pr-2">Description</th><th className="px-2 py-1 text-right">Qté</th><th className="px-2 py-1 text-right">P.U. HT</th><th className="py-1 pl-2 text-right">Total HT</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((l) => (
                  <tr key={l.key} className="border-b border-border last:border-0">
                    <td className="py-1 pr-2 text-foreground">{l.description || <span className="text-muted-foreground">—</span>}</td>
                    <td className="px-2 py-1 text-right text-muted-foreground">{l.quantity}</td>
                    <td className="px-2 py-1 text-right text-muted-foreground">{money(toMinor(l.unitPriceMajor))}</td>
                    <td className="py-1 pl-2 text-right text-foreground">{money(toMinor(l.unitPriceMajor) * l.quantity)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="sm:ml-auto sm:w-64">
            <Row label="Total TTC" value={money(totals.totalMinor)} strong />
          </div>
          {sections.filter((s) => s.heading.trim() && s.body.trim()).map((s) => (
            <div key={s.key}>
              <p className="text-xs font-semibold uppercase text-muted-foreground">{s.heading}</p>
              <p className="whitespace-pre-wrap text-foreground">{s.body}</p>
            </div>
          ))}
          {notes ? <div><p className="text-xs font-semibold uppercase text-muted-foreground">Notes</p><p className="whitespace-pre-wrap text-foreground">{notes}</p></div> : null}
          {terms ? <div><p className="text-xs font-semibold uppercase text-muted-foreground">Conditions</p><p className="whitespace-pre-wrap text-foreground">{terms}</p></div> : null}
          <p className="text-xs text-muted-foreground">Aperçu indicatif ; le PDF envoyé reprend ces éléments.</p>
        </CardContent>
      </Card>

      <div className="flex justify-end gap-3">
        <Button asChild variant="outline" type="button">
          <Link href={isEdit && quote ? `/devis/${quote.id}` : "/devis"}>Annuler</Link>
        </Button>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          {isEdit ? "Enregistrer le brouillon" : "Créer le devis"}
        </Button>
      </div>
    </div>
  );
}

function Row({
  label,
  value,
  strong,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={strong ? "font-display text-base font-bold text-foreground" : "text-foreground"}>
        {value}
      </span>
    </div>
  );
}
