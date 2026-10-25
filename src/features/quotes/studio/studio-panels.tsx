"use client";

import { useMemo, useState } from "react";
import { Check, Lightbulb, Palette, Plus, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatting/currency";
import type { AmountKind, QuoteTotals } from "@/lib/quotes/totals";
import {
  DEFAULT_SECONDARY,
  QUOTE_FONTS,
  QUOTE_PALETTES,
  QUOTE_TEMPLATES,
  matchingPalette,
  readableOn,
  tintOf,
  type QuoteDesign,
  type QuoteTemplateSpec,
} from "@/lib/quotes/design";
import { FormSelect } from "@/components/ui/form-select";
import { BLOCK_PRESETS, type StudioDoc, type StudioService } from "./types";
import type { DocUpdate } from "./studio-page";

const segmentBase = "flex-1 min-h-9 rounded-[9px] px-1.5 py-2 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";
const segmentOn = "bg-surface font-semibold text-foreground shadow-e1";
const segmentOff = "text-muted-foreground hover:text-foreground";

/* -------------------------------------------------------------------------- */
/* Panneau de gauche : blocs, catalogue, variables                            */
/* -------------------------------------------------------------------------- */

export function StudioLibrary({
  services,
  currency,
  localeTag,
  variables,
  onAddPreset,
  onAddService,
  onInsertVariable,
}: {
  services: StudioService[];
  currency: string;
  localeTag: string;
  variables: { key: string; label: string; value: string | null }[];
  onAddPreset: (presetId: string) => void;
  onAddService: (service: StudioService) => void;
  onInsertVariable: (key: string) => void;
}) {
  const [tab, setTab] = useState<"blocks" | "catalog" | "vars">("blocks");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? services.filter((s) => s.name.toLowerCase().includes(q) || s.description?.toLowerCase().includes(q)) : services;
  }, [services, query]);

  const tabs = [
    { id: "blocks", label: "Blocs" },
    { id: "catalog", label: "Catalogue" },
    { id: "vars", label: "Variables" },
  ] as const;

  return (
    <aside aria-label="Bibliothèque" className="flex flex-col gap-3.5 border-border bg-surface p-4 lg:w-72 lg:shrink-0 lg:overflow-y-auto lg:border-r">
      <div role="tablist" aria-label="Bibliothèque" className="flex gap-1 rounded-xl bg-muted p-1">
        {tabs.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} onClick={() => setTab(t.id)} className={cn(segmentBase, tab === t.id ? segmentOn : segmentOff)}>
            {t.label}
          </button>
        ))}
      </div>

      {tab === "blocks" ? (
        <div className="flex flex-col gap-2">
          <p className="text-xs text-muted-foreground">Cliquez pour ajouter à la fin du devis, ou utilisez « / » dans la page.</p>
          {BLOCK_PRESETS.map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => onAddPreset(b.id)}
              className="flex items-center gap-3 rounded-xl border border-border bg-surface p-2.5 text-left transition-colors hover:bg-muted"
            >
              <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-primary/10 text-[13px] font-bold text-accent">{b.glyph}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-foreground">{b.label}</span>
                <span className="block text-xs text-muted-foreground">{b.hint}</span>
              </span>
            </button>
          ))}
        </div>
      ) : null}

      {tab === "catalog" ? (
        <div className="flex flex-col gap-2">
          <label className="flex h-10 items-center gap-2 rounded-[10px] border border-border px-3 text-muted-foreground focus-within:ring-2 focus-within:ring-ring">
            <Search className="size-4" aria-hidden="true" />
            <span className="sr-only">Rechercher une prestation</span>
            <input type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Rechercher une prestation" className="min-w-0 flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground" />
          </label>
          {services.length === 0 ? (
            <p className="rounded-xl border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
              Votre catalogue est vide. Ajoutez vos prestations dans « Catalogue de services ».
            </p>
          ) : filtered.length === 0 ? (
            <p className="p-2 text-xs text-muted-foreground">Aucune prestation ne correspond.</p>
          ) : (
            filtered.map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={() => onAddService(s)}
                className="flex items-center justify-between gap-2.5 rounded-xl border border-border bg-surface px-3 py-2.5 text-left transition-colors hover:bg-muted"
              >
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-foreground">{s.name}</span>
                  <span className="block text-xs text-muted-foreground">{formatCurrency(s.priceMinor, currency, localeTag)} · {s.unit}</span>
                </span>
                <span aria-hidden="true" className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                  <Plus className="size-4" />
                </span>
              </button>
            ))
          )}
        </div>
      ) : null}

      {tab === "vars" ? (
        <div className="flex flex-col gap-2.5">
          <p className="text-xs text-muted-foreground">
            Cliquez sur une variable pour l’insérer à l’endroit du curseur. Elle est remplacée par sa valeur dans le PDF et sur la page du client.
          </p>
          {variables.map((v) => (
            <button
              key={v.key}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onInsertVariable(v.key)}
              className="flex items-center justify-between gap-2 rounded-[10px] border border-border px-2.5 py-2 text-left transition-colors hover:bg-muted"
              title={v.label}
            >
              <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-xs font-semibold text-accent">{`{${v.key}}`}</span>
              <span className="truncate text-right text-xs text-muted-foreground">{v.value ?? "—"}</span>
            </button>
          ))}
        </div>
      ) : null}

      <div className="mt-auto flex gap-2.5 rounded-[14px] bg-primary/10 p-3.5 text-[13px] text-accent">
        <Lightbulb className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <span>Glissez une ligne par sa poignée pour la réordonner. Ctrl + Z annule, Ctrl + S enregistre.</span>
      </div>
    </aside>
  );
}

/* -------------------------------------------------------------------------- */
/* Panneau de droite : mise en page et réglages                               */
/* -------------------------------------------------------------------------- */

function addDays(isoDate: string, days: number) {
  const d = new Date(`${isoDate}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const VALIDITY_PRESETS = [15, 30, 60] as const;

export function StudioSettings({
  doc,
  update,
  issueDateIso,
  currency,
  localeTag,
  minorUnits,
  totals,
}: {
  doc: StudioDoc;
  update: DocUpdate;
  issueDateIso: string;
  currency: string;
  localeTag: string;
  minorUnits: number;
  totals: QuoteTotals;
}) {
  const money = (minor: number) => formatCurrency(minor, currency, localeTag);
  const setDesign = (patch: Partial<QuoteDesign>) => update((d) => ({ ...d, design: { ...d.design, ...patch } }), "design");
  const secondary = doc.design.secondary ?? DEFAULT_SECONDARY;
  const activePalette = matchingPalette(doc.design);
  const validityPreset = VALIDITY_PRESETS.find((n) => addDays(issueDateIso, n) === doc.expiryDate);
  const [customValidity, setCustomValidity] = useState(!validityPreset && Boolean(doc.expiryDate));

  // TVA : un taux commun appliqué à toutes les lignes (les taux mixtes restent possibles, signalés).
  const rates = [...new Set(doc.lines.map((l) => l.taxRate))];
  const vatOn = doc.lines.length > 0 && rates.every((r) => r > 0);
  const mixed = rates.length > 1;
  const commonRate = rates.length === 1 && rates[0]! > 0 ? rates[0]! : 18;
  const setAllRates = (rate: number) => update((d) => ({ ...d, lines: d.lines.map((l) => ({ ...l, taxRate: rate })) }), "vat-rate");

  const unit = currency.toUpperCase() === "XOF" ? "FCFA" : currency.toUpperCase();
  const amountKinds: { value: AmountKind | null; label: string }[] = [
    { value: null, label: "Aucun" },
    { value: "PERCENT", label: "%" },
    { value: "AMOUNT", label: unit },
  ];
  const lineCount = doc.lines.length;

  return (
    <aside aria-label="Mise en page et réglages" className="flex flex-col gap-5 border-border bg-surface p-[18px] lg:w-80 lg:shrink-0 lg:overflow-y-auto lg:border-l">
      <section className="flex flex-col gap-2.5">
        <div className="flex items-baseline justify-between">
          <h2 className="font-display text-sm font-bold text-foreground">Modèle</h2>
          <span className="text-xs text-muted-foreground">{QUOTE_TEMPLATES.length} modèles</span>
        </div>
        <div className="grid grid-cols-2 gap-2">
          {QUOTE_TEMPLATES.map((m) => {
            const on = doc.design.template === m.value;
            return (
              <button
                key={m.value}
                type="button"
                aria-pressed={on}
                title={m.hint}
                onClick={() => setDesign({ template: m.value })}
                className={cn("relative rounded-xl bg-surface p-1.5 text-left transition-shadow", on ? "border-2 border-primary" : "border-2 border-transparent ring-1 ring-border hover:ring-border-strong")}
              >
                <TemplateThumb spec={m} accent={doc.design.accent} secondary={secondary} />
                <span className="mt-1.5 block truncate text-xs font-semibold text-foreground">{m.label}</span>
                <span className="block truncate text-[11px] text-muted-foreground">{m.hint}</span>
                {on ? (
                  <span className="absolute right-2.5 top-2.5 flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground" aria-hidden="true">
                    <Check className="size-3" />
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="font-display text-sm font-bold text-foreground">Palette de couleurs</h2>
        <div className="grid grid-cols-5 gap-2">
          {QUOTE_PALETTES.map((p) => {
            const on = activePalette?.id === p.id;
            return (
              <button
                key={p.id}
                type="button"
                aria-label={`Palette ${p.label}`}
                aria-pressed={on}
                title={p.label}
                onClick={() => setDesign({ accent: p.accent, secondary: p.secondary })}
                className="group flex flex-col items-center gap-1"
              >
                <span
                  className="relative block size-10 overflow-hidden rounded-full border-[3px] border-white"
                  style={{ boxShadow: on ? "0 0 0 2px var(--color-foreground)" : "0 0 0 1px var(--color-border)" }}
                >
                  <span className="absolute inset-0" style={{ background: `linear-gradient(135deg, ${p.accent} 0 55%, ${p.secondary} 55% 100%)` }} />
                </span>
                <span className={cn("max-w-full truncate text-[10.5px]", on ? "font-semibold text-foreground" : "text-muted-foreground")}>{p.label}</span>
              </button>
            );
          })}
        </div>

        <div className={cn("flex flex-col gap-2.5 rounded-xl border p-3", activePalette ? "border-border" : "border-primary bg-primary/5")}>
          <div className="flex items-center gap-2 text-[13px] font-semibold text-foreground">
            <Palette className="size-4 text-accent" aria-hidden="true" />
            Palette personnalisée
            {!activePalette ? <span className="ml-auto rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground">Active</span> : null}
          </div>
          <ColorField label="Principale" value={doc.design.accent} onChange={(v) => setDesign({ accent: v })} />
          <ColorField label="Secondaire" value={secondary} onChange={(v) => setDesign({ secondary: v })} />
          <p className="text-[11px] text-muted-foreground">La principale colore les titres et le total ; la secondaire, les en-têtes sombres et les textes forts.</p>
        </div>
      </section>

      <section className="flex flex-col gap-2.5">
        <h2 className="font-display text-sm font-bold text-foreground">Police</h2>
        <div role="group" aria-label="Police" className="flex gap-1 rounded-xl bg-muted p-1">
          {QUOTE_FONTS.map((f) => (
            <button key={f.value} type="button" aria-pressed={doc.design.font === f.value} onClick={() => setDesign({ font: f.value })} className={cn(segmentBase, doc.design.font === f.value ? segmentOn : segmentOff)}>
              {f.label}
            </button>
          ))}
        </div>
      </section>

      <section className="flex flex-col gap-3.5">
        <h2 className="font-display text-sm font-bold text-foreground">Réglages du devis</h2>

        <div className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
          <label htmlFor="studio-validity">Validité</label>
          <FormSelect
            id="studio-validity"
            value={customValidity ? "custom" : validityPreset ? String(validityPreset) : doc.expiryDate ? "custom" : "none"}
            onValueChange={(v) => {
              if (v === "custom") { setCustomValidity(true); return; }
              setCustomValidity(false);
              update((d) => ({ ...d, expiryDate: v === "none" ? "" : addDays(issueDateIso, Number(v)) }));
            }}
            options={[
              { value: "none", label: "Sans date de validité" },
              ...VALIDITY_PRESETS.map((n) => ({ value: String(n), label: `${n} jours` })),
              { value: "custom", label: "Date personnalisée…" },
            ]}
            className="h-10 rounded-[10px]"
          />
          {customValidity ? (
            <input
              type="date"
              aria-label="Date de validité personnalisée"
              value={doc.expiryDate}
              min={issueDateIso}
              onChange={(e) => update((d) => ({ ...d, expiryDate: e.target.value }), "expiry")}
              className="h-10 rounded-[10px] border border-border bg-surface px-2.5 text-sm text-foreground"
            />
          ) : null}
        </div>

        <AmountControl
          label="Remise"
          kinds={amountKinds}
          type={doc.discountType}
          value={doc.discountValue}
          minorUnits={minorUnits}
          onType={(t) => update((d) => ({ ...d, discountType: t, discountValue: 0 }))}
          onValue={(v) => update((d) => ({ ...d, discountValue: v }), "discount")}
          unit={unit}
        />

        <AmountControl
          label="Acompte à la signature"
          kinds={amountKinds}
          type={doc.depositType}
          value={doc.depositValue}
          minorUnits={minorUnits}
          onType={(t) => update((d) => ({ ...d, depositType: t, depositValue: t === "PERCENT" ? 30 : 0 }))}
          onValue={(v) => update((d) => ({ ...d, depositValue: v }), "deposit")}
          unit={unit}
          slider
        />

        <div className="flex flex-col gap-2 text-[13px] text-muted-foreground">
          <label className="flex min-h-10 items-center justify-between gap-2.5">
            <span>Appliquer la TVA</span>
            <input
              type="checkbox"
              checked={vatOn}
              disabled={lineCount === 0}
              onChange={(e) => setAllRates(e.target.checked ? commonRate : 0)}
              className="size-5 accent-[var(--color-primary)]"
            />
          </label>
          {vatOn || mixed ? (
            <label className="flex items-center justify-between gap-2.5">
              <span>Taux appliqué à toutes les lignes</span>
              <span className="flex items-center gap-1">
                <input
                  type="number"
                  min={0}
                  max={100}
                  aria-label="Taux de TVA en pourcentage"
                  value={mixed ? "" : commonRate}
                  placeholder={mixed ? "mixte" : undefined}
                  onChange={(e) => setAllRates(Math.min(100, Math.max(0, Math.round(Number(e.target.value) || 0))))}
                  className="h-9 w-16 rounded-lg border border-border bg-surface px-2 text-right text-sm text-foreground"
                />
                %
              </span>
            </label>
          ) : null}
          {mixed ? <p className="text-xs text-warm-strong">Les lignes ont des taux différents (issus du catalogue). Saisir un taux l’applique à toutes.</p> : null}
        </div>
      </section>

      <section className="mt-auto flex flex-col gap-1.5 rounded-[14px] border border-border p-3.5">
        <div className="text-xs text-muted-foreground">Total du devis</div>
        <div className="font-display text-2xl font-extrabold text-foreground">{money(totals.totalMinor)}</div>
        <div className="text-xs text-muted-foreground">
          {lineCount} ligne{lineCount > 1 ? "s" : ""}
          {totals.depositMinor > 0 ? ` · acompte ${money(totals.depositMinor)}` : ""}
        </div>
      </section>
    </aside>
  );
}

function AmountControl({
  label,
  kinds,
  type,
  value,
  minorUnits,
  onType,
  onValue,
  unit,
  slider,
}: {
  label: string;
  kinds: { value: AmountKind | null; label: string }[];
  type: AmountKind | null;
  value: number;
  minorUnits: number;
  onType: (t: AmountKind | null) => void;
  onValue: (v: number) => void;
  unit: string;
  slider?: boolean;
}) {
  const id = label.replace(/\W+/g, "-").toLowerCase();
  return (
    <div className="flex flex-col gap-1.5 text-[13px] text-muted-foreground">
      <div className="flex items-center justify-between gap-2">
        <span id={`${id}-label`}>{label}</span>
        {type === "PERCENT" ? <strong className="text-foreground">{value} %</strong> : null}
      </div>
      <div role="group" aria-labelledby={`${id}-label`} className="flex gap-1 rounded-xl bg-muted p-1">
        {kinds.map((k) => (
          <button key={k.label} type="button" aria-pressed={type === k.value} onClick={() => onType(k.value)} className={cn(segmentBase, type === k.value ? segmentOn : segmentOff)}>
            {k.label}
          </button>
        ))}
      </div>
      {type === "PERCENT" ? (
        slider ? (
          <input type="range" min={0} max={100} step={5} value={value} aria-label={`${label} en pourcentage`} onChange={(e) => onValue(Number(e.target.value))} className="accent-[var(--color-primary)]" />
        ) : (
          <span className="flex items-center gap-1">
            <input type="number" min={0} max={100} value={value} aria-label={`${label} en pourcentage`} onChange={(e) => onValue(Math.min(100, Math.max(0, Math.round(Number(e.target.value) || 0))))} className="h-9 w-20 rounded-lg border border-border bg-surface px-2 text-right text-sm text-foreground" />%
          </span>
        )
      ) : null}
      {type === "AMOUNT" ? (
        <span className="flex items-center gap-1.5">
          <input
            type="number"
            min={0}
            step={minorUnits ? 0.01 : 1000}
            value={value / 10 ** minorUnits}
            aria-label={`${label} en ${unit}`}
            onChange={(e) => onValue(Math.max(0, Math.round((Number(e.target.value) || 0) * 10 ** minorUnits)))}
            className="h-9 w-32 rounded-lg border border-border bg-surface px-2 text-right text-sm text-foreground"
          />
          {unit}
        </span>
      ) : null}
    </div>
  );
}

/** Miniature d'un modèle : reprend son en-tête, son tableau et sa barre de total. */
function TemplateThumb({ spec, accent, secondary }: { spec: QuoteTemplateSpec; accent: string; secondary: string }) {
  const header = (() => {
    switch (spec.header) {
      case "band":
        return <span className="absolute inset-x-0 top-0 h-[18px]" style={{ background: accent }} />;
      case "dark":
        return (
          <span className="absolute inset-x-0 top-0 h-[18px]" style={{ background: secondary }}>
            <span className="absolute right-2 top-[6px] h-1.5 w-6 rounded-sm" style={{ background: accent }} />
          </span>
        );
      case "split":
        return (
          <>
            <span className="absolute right-2 top-2 h-2.5 w-9 rounded-sm" style={{ background: accent }} />
            <span className="absolute inset-x-2 top-[18px] h-[2px] rounded" style={{ background: accent }} />
          </>
        );
      case "centered":
        return (
          <>
            <span className="absolute left-1/2 top-2 h-1.5 w-8 -translate-x-1/2 rounded-sm" style={{ background: secondary }} />
            <span className="absolute inset-x-3 top-[15px] h-px" style={{ background: accent }} />
            <span className="absolute inset-x-3 top-[19px] h-px" style={{ background: accent }} />
          </>
        );
      case "sidebar":
        return (
          <>
            <span className="absolute inset-y-0 left-0 w-1.5" style={{ background: accent }} />
            <span className="absolute right-2 top-2 h-2 w-7 rounded-sm" style={{ background: accent }} />
          </>
        );
      case "stripe":
        return (
          <>
            <span className="absolute inset-x-0 top-0 h-1" style={{ background: secondary }} />
            <span className="absolute right-2 top-2.5 h-2 w-7 rounded-full" style={{ background: accent }} />
          </>
        );
      case "block":
        return <span className="absolute right-0 top-0 h-[22px] w-[42%] rounded-bl-lg" style={{ background: accent }} />;
      case "rule":
      default:
        return (
          <>
            <span className="absolute left-2 top-2 h-1.5 w-8 rounded-sm" style={{ background: secondary }} />
            <span className="absolute inset-x-2 top-[17px] h-px bg-[#12263A]/40" />
          </>
        );
    }
  })();
  const tableBg =
    spec.table === "filled" ? accent : spec.table === "secondary" ? secondary : spec.table === "tint" ? tintOf(accent, 0.18) : "transparent";
  return (
    <span className="relative block h-[72px] overflow-hidden rounded-md border border-border bg-white">
      {header}
      <span className="absolute left-2.5 right-2.5 top-[28px] h-[5px] rounded-sm" style={{ background: tableBg, borderBottom: spec.table === "line" ? `1px solid ${secondary}` : undefined }} />
      <span className="absolute left-2.5 right-6 top-[38px] h-[3px] rounded-sm bg-[#E2E9E5]" />
      <span className="absolute left-2.5 right-9 top-[45px] h-[3px] rounded-sm bg-[#E2E9E5]" />
      <span
        className="absolute right-2.5 top-[55px] h-[7px] w-[38%] rounded-sm"
        style={spec.filledTotal ? { background: accent } : { borderTop: `2px solid ${secondary}` }}
      />
    </span>
  );
}

/** Choix d'une couleur : pastille (sélecteur natif) + saisie hexadécimale. */
function ColorField({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  const [draft, setDraft] = useState(value);
  const [lastValue, setLastValue] = useState(value);
  if (lastValue !== value) {
    setLastValue(value);
    setDraft(value);
  }
  const id = `color-${label.toLowerCase()}`;
  return (
    <div className="flex items-center gap-2.5">
      <label htmlFor={id} className="w-20 text-xs text-muted-foreground">{label}</label>
      <span className="relative size-9 shrink-0 overflow-hidden rounded-lg ring-1 ring-border" style={{ background: value }}>
        <input
          id={id}
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value.toUpperCase())}
          className="absolute inset-0 size-full cursor-pointer opacity-0"
        />
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-[10px] font-bold" style={{ color: readableOn(value) }} aria-hidden="true">
          Aa
        </span>
      </span>
      <input
        aria-label={`Couleur ${label.toLowerCase()} en hexadécimal`}
        value={draft}
        maxLength={7}
        onChange={(e) => {
          const v = e.target.value.startsWith("#") ? e.target.value : `#${e.target.value}`;
          setDraft(v);
          if (/^#[0-9a-f]{6}$/i.test(v)) onChange(v.toUpperCase());
        }}
        className="h-9 min-w-0 flex-1 rounded-lg border border-border bg-surface px-2.5 font-mono text-xs uppercase text-foreground"
      />
    </div>
  );
}
