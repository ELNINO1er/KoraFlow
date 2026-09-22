"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { computeQuoteTotals, type AmountKind } from "@/lib/quotes/totals";
import { formatCurrency } from "@/lib/formatting/currency";
import { createQuoteAction } from "@/features/quotes/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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

const selectClass =
  "flex h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function QuoteForm({
  contacts,
  services,
  currency,
  localeTag,
  minorUnits,
}: {
  contacts: ContactOption[];
  services: ServiceOption[];
  currency: string;
  localeTag: string;
  minorUnits: number;
}) {
  const router = useRouter();
  const keyRef = useRef(1);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [contactId, setContactId] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [discountType, setDiscountType] = useState<"" | AmountKind>("");
  const [discountValue, setDiscountValue] = useState(0);
  const [depositType, setDepositType] = useState<"" | AmountKind>("");
  const [depositValue, setDepositValue] = useState(0);
  const [expiryDate, setExpiryDate] = useState("");
  const [notes, setNotes] = useState("");

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

  function submit() {
    setError(null);
    if (!contactId) {
      setError("Sélectionnez un client.");
      return;
    }
    if (lines.length === 0) {
      setError("Ajoutez au moins une ligne.");
      return;
    }
    const payload = {
      contactId,
      expiryDate: expiryDate || undefined,
      notes: notes || undefined,
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
      const result = await createQuoteAction(payload);
      if (!result.ok) {
        setError(result.error ?? "Impossible de créer le devis.");
        return;
      }
      router.push(`/devis/${result.quoteId}`);
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
            <select
              id="contact"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
              className={selectClass}
            >
              <option value="">— Sélectionner —</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
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
        <CardHeader className="flex-row items-center justify-between">
          <CardTitle>Lignes</CardTitle>
          <div className="flex items-center gap-2">
            {services.length > 0 ? (
              <select
                aria-label="Ajouter un service"
                value=""
                onChange={(e) => {
                  if (e.target.value) addServiceLine(e.target.value);
                  e.currentTarget.selectedIndex = 0;
                }}
                className="h-9 rounded-lg border border-input bg-surface px-3 text-sm"
              >
                <option value="">+ Depuis le catalogue</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} — {money(s.priceMinor)}
                  </option>
                ))}
              </select>
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
                <select
                  value={discountType}
                  onChange={(e) => setDiscountType(e.target.value as "" | AmountKind)}
                  className={selectClass}
                >
                  <option value="">Aucune</option>
                  <option value="PERCENT">Pourcentage (%)</option>
                  <option value="AMOUNT">Montant ({currency})</option>
                </select>
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
                <select
                  value={depositType}
                  onChange={(e) => setDepositType(e.target.value as "" | AmountKind)}
                  className={selectClass}
                >
                  <option value="">Aucun</option>
                  <option value="PERCENT">Pourcentage (%)</option>
                  <option value="AMOUNT">Montant ({currency})</option>
                </select>
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
              <Textarea id="notes" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
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

      <div className="flex justify-end gap-3">
        <Button asChild variant="outline" type="button">
          <Link href="/devis">Annuler</Link>
        </Button>
        <Button type="button" onClick={submit} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : null}
          Créer le devis
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
