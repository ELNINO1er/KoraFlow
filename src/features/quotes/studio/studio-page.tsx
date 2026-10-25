"use client";

import { useLayoutEffect, useRef, useState, type CSSProperties, type TextareaHTMLAttributes } from "react";
import { ChevronUp, GripVertical, Plus, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatting/currency";
import type { QuoteTotals } from "@/lib/quotes/totals";
import { QUOTE_VARIABLES } from "@/lib/quotes/variables";
import { DEFAULT_SECONDARY, readableOn, templateSpec, tintOf } from "@/lib/quotes/design";
import { FormSelect } from "@/components/ui/form-select";
import { BLOCK_PRESETS, type StudioContact, type StudioDoc, type StudioLine, type StudioOrganization } from "./types";

export type DocUpdate = (updater: (doc: StudioDoc) => StudioDoc, group?: string | null) => void;
export type FocusRegistrar = (el: HTMLInputElement | HTMLTextAreaElement, apply: (value: string) => void) => void;

const FONT_STACKS: Record<StudioDoc["design"]["font"], string> = {
  inter: "var(--font-inter), Inter, system-ui, sans-serif",
  manrope: "var(--font-manrope), Manrope, var(--font-inter), sans-serif",
  serif: "Georgia, 'Times New Roman', serif",
};

const MUTED = "#5B6B7B";

/** Zone de texte qui s'agrandit avec son contenu, comme une ligne de document. */
function AutoTextarea(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [props.value]);
  return <textarea ref={ref} rows={1} {...props} className={cn("doc-field w-full resize-none overflow-hidden", props.className)} />;
}

function contactDisplay(c: StudioContact) {
  const person = `${c.firstName} ${c.lastName ?? ""}`.trim();
  return { title: c.companyName || person, person: c.companyName ? person : null };
}

function initials(name: string) {
  return name.trim().slice(0, 2).toUpperCase() || "OR";
}

export function StudioPage({
  doc,
  update,
  org,
  contacts,
  isNew,
  number,
  issueDate,
  currency,
  localeTag,
  minorUnits,
  totals,
  registerFocus,
  onAddPreset,
}: {
  doc: StudioDoc;
  update: DocUpdate;
  org: StudioOrganization;
  contacts: StudioContact[];
  isNew: boolean;
  number: string | null;
  issueDate: Date;
  currency: string;
  localeTag: string;
  minorUnits: number;
  totals: QuoteTotals;
  registerFocus: FocusRegistrar;
  onAddPreset: (presetId: string) => void;
}) {
  const [slashOpen, setSlashOpen] = useState(false);
  const [dragKey, setDragKey] = useState<number | null>(null);
  const [armedKey, setArmedKey] = useState<number | null>(null);

  const { template, accent, font } = doc.design;
  const secondary = doc.design.secondary ?? DEFAULT_SECONDARY;
  const spec = templateSpec(template);
  const onAccent = readableOn(accent);
  const money = (minor: number) => formatCurrency(minor, currency, localeTag);
  const toMinor = (major: number) => Math.round(major * 10 ** minorUnits);
  const dateFmt = new Intl.DateTimeFormat(localeTag, { day: "2-digit", month: "2-digit", year: "numeric" });
  const contact = contacts.find((c) => c.id === doc.contactId) ?? null;
  const numberLabel = number ? `N° ${number}` : "Numéro attribué à l’enregistrement";
  const docLabel = "DEVIS";
  const unitLabel = currency.toUpperCase() === "XOF" ? "FCFA (XOF)" : currency.toUpperCase();
  const orgAddress = [org.addressLine1, org.city].filter(Boolean).join(", ");
  const footer = [org.legalName || org.name, orgAddress, org.email, org.phone, org.taxId ? `N° fiscal ${org.taxId}` : null].filter(Boolean).join(" · ");
  const sectionHeadingColor = spec.header === "rule" ? secondary : accent;

  const setField = <K extends keyof StudioDoc>(key: K, value: StudioDoc[K], group: string | null = key) =>
    update((d) => ({ ...d, [key]: value }), group);

  const updateLine = (key: number, patch: Partial<StudioLine>, group: string) =>
    update((d) => ({ ...d, lines: d.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) }), group);

  const moveLine = (from: number, to: number) =>
    update((d) => {
      if (from === to || to < 0 || to >= d.lines.length) return d;
      const lines = [...d.lines];
      const [moved] = lines.splice(from, 1);
      lines.splice(to, 0, moved!);
      return { ...d, lines };
    });

  const focusProps = (apply: (value: string) => void) => ({
    onFocus: (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) => registerFocus(e.currentTarget, apply),
  });

  const logo = (size: number, inverted: boolean) =>
    org.hasLogo ? (
      // eslint-disable-next-line @next/next/no-img-element -- logo servi par l'API privée de l'organisation
      <img src={`/api/organization-logos/${org.id}`} alt="" className="object-contain" style={{ width: size, height: size, borderRadius: 12, background: "#FFFFFF", padding: 4 }} />
    ) : (
      <span
        className="flex items-center justify-center font-extrabold"
        style={{ width: size, height: size, borderRadius: 12, background: inverted ? "#FFFFFF" : accent, color: inverted ? accent : "#FFFFFF" }}
      >
        {initials(org.name)}
      </span>
    );

  const thBase: CSSProperties = { padding: "10px 8px", fontSize: 11, letterSpacing: ".06em", fontWeight: 600, textAlign: "left" };
  const thTone: CSSProperties =
    spec.table === "filled"
      ? { background: accent, color: onAccent }
      : spec.table === "secondary"
        ? { background: secondary, color: readableOn(secondary) }
        : spec.table === "tint"
          ? { background: tintOf(accent, 0.12), color: secondary }
          : { background: "transparent", color: MUTED, borderBottom: `1px solid ${secondary}` };
  const roundedTable = spec.table !== "line";

  return (
    <article
      aria-label="Page du devis"
      className="relative shrink-0 bg-white text-[#12263A] shadow-[0_1px_2px_rgba(18,38,58,.06),0_12px_32px_rgba(18,38,58,.10)]"
      style={{ width: 794, minHeight: 1123, borderRadius: 4, paddingBottom: 72, fontFamily: FONT_STACKS[font] }}
    >
      {spec.header === "sidebar" ? <div aria-hidden="true" className="absolute inset-y-0 left-0 w-3.5" style={{ background: accent, borderRadius: "4px 0 0 4px" }} /> : null}
      {/* En-tête selon le modèle */}
      <TemplateHeader
        header={spec.header}
        accent={accent}
        secondary={secondary}
        orgName={org.name}
        orgLine={[orgAddress, org.email].filter(Boolean).join(" · ")}
        docLabel={docLabel}
        numberLabel={numberLabel}
        logo={logo}
      />

      {/* Destinataire et informations */}
      <div className="grid grid-cols-2 gap-6" style={{ padding: "28px 56px 0" }}>
        <div className="rounded-xl bg-[#F6F8F7] px-4 py-3.5">
          <div className="text-[11px] tracking-[.06em]" style={{ color: MUTED }}>ADRESSÉ À</div>
          {isNew ? (
            <>
              <label htmlFor="studio-contact" className="sr-only">Client du devis</label>
              <FormSelect
                id="studio-contact"
                value={doc.contactId || undefined}
                onValueChange={(v) => setField("contactId", v, null)}
                placeholder="Choisir un client…"
                options={contacts.map((c) => {
                  const d = contactDisplay(c);
                  return { value: c.id, label: d.person ? `${d.title} — ${d.person}` : d.title };
                })}
                className="mt-1 h-9 border-transparent bg-transparent px-1.5 font-bold shadow-none hover:border-[#DCE5E0] hover:bg-[#FAFCFB]"
              />
            </>
          ) : null}
          {contact ? (
            <div className={isNew ? "px-1.5" : ""}>
              {!isNew ? <div className="mt-1 font-bold">{contactDisplay(contact).title}</div> : null}
              <div className="text-[13px] text-[#3E4C59]">
                {contactDisplay(contact).person ? <div>{contactDisplay(contact).person}</div> : null}
                {contact.email ? <div>{contact.email}</div> : null}
                {contact.phone ? <div>{contact.phone}</div> : null}
              </div>
            </div>
          ) : !isNew ? null : (
            <p className="px-1.5 text-[13px]" style={{ color: MUTED }}>Le devis s’enregistre dès qu’un client et une ligne sont renseignés.</p>
          )}
        </div>
        <div className="grid grid-cols-2 content-start gap-2.5 text-[13px]">
          <div>
            <div className="text-[11px] tracking-[.06em]" style={{ color: MUTED }}>ÉMIS LE</div>
            <div className="font-semibold">{dateFmt.format(issueDate)}</div>
          </div>
          <div>
            <div className="text-[11px] tracking-[.06em]" style={{ color: MUTED }}>VALABLE JUSQU’AU</div>
            <div className="font-semibold">{doc.expiryDate ? dateFmt.format(new Date(`${doc.expiryDate}T00:00:00`)) : "—"}</div>
          </div>
          <div>
            <div className="text-[11px] tracking-[.06em]" style={{ color: MUTED }}>DEVISE</div>
            <div className="font-semibold">{unitLabel}</div>
          </div>
          <div>
            <div className="text-[11px] tracking-[.06em]" style={{ color: MUTED }}>STATUT</div>
            <div className="font-semibold">Brouillon</div>
          </div>
        </div>
      </div>

      {/* Objet et introduction */}
      <div style={{ padding: "24px 56px 0" }}>
        <label htmlFor="studio-title" className="sr-only">Objet du devis</label>
        <input
          id="studio-title"
          value={doc.title}
          maxLength={160}
          placeholder="Objet du devis"
          onChange={(e) => setField("title", e.target.value)}
          {...focusProps((v) => setField("title", v.slice(0, 160)))}
          className="doc-field -ml-2 w-[calc(100%+16px)] px-2 py-1.5 text-[22px] font-extrabold placeholder:text-[#A9B6C2]"
        />
        <label htmlFor="studio-intro" className="sr-only">Introduction</label>
        <AutoTextarea
          id="studio-intro"
          value={doc.introduction}
          maxLength={5000}
          placeholder="Introduction : contexte, besoin du client…"
          onChange={(e) => setField("introduction", e.target.value)}
          {...focusProps((v) => setField("introduction", v.slice(0, 5000)))}
          className="-ml-2 mt-2 px-2 py-1.5 text-sm leading-relaxed text-[#3E4C59] placeholder:text-[#A9B6C2]"
          style={{ width: "calc(100% + 16px)" }}
        />
      </div>

      {/* Lignes de prestation */}
      <div style={{ padding: "22px 56px 0" }}>
        <table className="w-full border-separate border-spacing-0 text-[13px]">
          <thead>
            <tr>
              <th scope="col" style={{ ...thBase, ...thTone, width: 26, borderRadius: roundedTable ? "8px 0 0 8px" : 0 }}><span className="sr-only">Ordre</span></th>
              <th scope="col" style={{ ...thBase, ...thTone }}>PRESTATION</th>
              <th scope="col" style={{ ...thBase, ...thTone, textAlign: "right", width: 70 }}>QTÉ</th>
              <th scope="col" style={{ ...thBase, ...thTone, textAlign: "right", width: 130 }}>PRIX UNITAIRE</th>
              <th scope="col" style={{ ...thBase, ...thTone, textAlign: "right", width: 120 }}>TOTAL</th>
              <th scope="col" style={{ ...thBase, ...thTone, width: 64, borderRadius: roundedTable ? "0 8px 8px 0" : 0 }}><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {doc.lines.map((l, index) => (
              <tr
                key={l.key}
                draggable={armedKey === l.key}
                onDragStart={(e) => { setDragKey(l.key); e.dataTransfer.effectAllowed = "move"; }}
                onDragEnd={() => { setDragKey(null); setArmedKey(null); }}
                onDragOver={(e) => { if (dragKey !== null) e.preventDefault(); }}
                onDrop={(e) => {
                  e.preventDefault();
                  const from = doc.lines.findIndex((x) => x.key === dragKey);
                  if (from !== -1) moveLine(from, index);
                  setDragKey(null);
                  setArmedKey(null);
                }}
                className={cn("group align-top", dragKey === l.key && "opacity-40")}
              >
                <td className="border-b border-[#EDF1EE] py-2 pr-0.5">
                  <span
                    onMouseDown={() => setArmedKey(l.key)}
                    onMouseUp={() => setArmedKey(null)}
                    className="flex cursor-grab justify-center pt-1.5 text-[#8696A6] opacity-40 transition-opacity group-hover:opacity-100"
                    title="Glisser pour réordonner"
                    aria-hidden="true"
                  >
                    <GripVertical className="size-4" />
                  </span>
                </td>
                <td className="border-b border-[#EDF1EE] py-2 pr-2">
                  <input
                    aria-label="Intitulé de la prestation"
                    value={l.label}
                    maxLength={300}
                    placeholder="Intitulé de la prestation"
                    onChange={(e) => updateLine(l.key, { label: e.target.value }, `label-${l.key}`)}
                    className="doc-field w-full px-2 py-1.5 font-semibold placeholder:font-normal placeholder:text-[#A9B6C2]"
                  />
                  <input
                    aria-label="Détail de la prestation"
                    value={l.detail}
                    maxLength={190}
                    placeholder="Détail (facultatif)"
                    onChange={(e) => updateLine(l.key, { detail: e.target.value }, `detail-${l.key}`)}
                    className="doc-field w-full px-2 py-0.5 text-xs text-[#5B6B7B] placeholder:text-[#A9B6C2]"
                  />
                </td>
                <td className="border-b border-[#EDF1EE] px-1.5 py-2">
                  <input
                    type="number"
                    min={1}
                    step={1}
                    aria-label="Quantité"
                    value={l.quantity}
                    onChange={(e) => updateLine(l.key, { quantity: Math.min(100_000, Math.max(1, Math.round(Number(e.target.value) || 1))) }, `qty-${l.key}`)}
                    className="doc-field w-full px-1.5 py-1.5 text-right tabular-nums"
                  />
                </td>
                <td className="border-b border-[#EDF1EE] px-1.5 py-2">
                  <input
                    type="number"
                    min={0}
                    step={minorUnits ? 0.01 : 1000}
                    aria-label="Prix unitaire hors taxes"
                    value={l.unitPriceMajor}
                    onChange={(e) => updateLine(l.key, { unitPriceMajor: Math.max(0, Number(e.target.value) || 0) }, `price-${l.key}`)}
                    className="doc-field w-full px-1.5 py-1.5 text-right tabular-nums"
                  />
                </td>
                <td className="whitespace-nowrap border-b border-[#EDF1EE] px-1.5 pb-2 pt-3.5 text-right font-bold tabular-nums">
                  {money(toMinor(l.unitPriceMajor) * l.quantity)}
                </td>
                <td className="border-b border-[#EDF1EE] py-2 pl-1">
                  <span className="flex justify-end gap-0.5 opacity-40 transition-opacity group-hover:opacity-100 group-focus-within:opacity-100">
                    <button type="button" aria-label="Monter la ligne" disabled={index === 0} onClick={() => moveLine(index, index - 1)} className="flex size-7 items-center justify-center rounded-md text-[#5B6B7B] hover:bg-[#F1F6F3] disabled:opacity-30">
                      <ChevronUp className="size-3.5" />
                    </button>
                    <button type="button" aria-label="Supprimer la ligne" onClick={() => update((d) => ({ ...d, lines: d.lines.filter((x) => x.key !== l.key) }))} className="flex size-7 items-center justify-center rounded-md text-[#B04A33] hover:bg-[#FBEDE9]">
                      <Trash2 className="size-3.5" />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {doc.lines.length === 0 ? (
          <p className="mt-3 rounded-lg border border-dashed border-[#D3DED8] p-4 text-center text-[13px]" style={{ color: MUTED }}>
            Aucune ligne. Ajoutez une prestation du catalogue (panneau de gauche) ou une ligne libre.
          </p>
        ) : null}
        <button
          type="button"
          onClick={() => onAddPreset("line")}
          className="mt-2.5 flex h-9 items-center gap-2 rounded-[10px] border border-dashed border-[#B9CCC1] px-3 font-semibold text-[#23744C] hover:bg-[#F1F8F4]"
        >
          <Plus className="size-4" /> Ajouter une ligne
        </button>
      </div>

      {/* Totaux */}
      <div className="flex justify-end" style={{ padding: "18px 56px 0" }}>
        <div className="flex w-[300px] flex-col gap-1.5 text-[13px]">
          <TotalRow label="Sous-total HT" value={money(totals.subtotalMinor)} />
          {totals.discountMinor > 0 ? <TotalRow label="Remise" value={`− ${money(totals.discountMinor)}`} /> : null}
          <TotalRow label={totals.taxMinor > 0 ? "TVA" : "TVA (non applicable)"} value={money(totals.taxMinor)} />
          <div
            className="mt-1 flex justify-between text-[15px] font-extrabold"
            style={spec.filledTotal ? { background: accent, color: onAccent, padding: "10px 12px", borderRadius: 10 } : { borderTop: `2px solid ${secondary}`, padding: "10px 0", color: secondary }}
          >
            <span>Total TTC</span>
            <span className="tabular-nums">{money(totals.totalMinor)}</span>
          </div>
          {totals.depositMinor > 0 ? (
            <>
              <TotalRow label={doc.depositType === "PERCENT" ? `Acompte à la signature (${doc.depositValue} %)` : "Acompte à la signature"} value={money(totals.depositMinor)} strong />
              <TotalRow label="Reste à payer" value={money(totals.remainingMinor)} />
            </>
          ) : null}
        </div>
      </div>

      {/* Sections rédactionnelles */}
      {doc.sections.map((s) => (
        <div key={s.key} className="group" style={{ padding: "22px 56px 0" }}>
          <div className="flex items-center gap-2">
            <input
              aria-label="Titre de la section"
              value={s.heading}
              maxLength={160}
              placeholder="Titre de la section"
              onChange={(e) => update((d) => ({ ...d, sections: d.sections.map((x) => (x.key === s.key ? { ...x, heading: e.target.value } : x)) }), `sh-${s.key}`)}
              {...focusProps((v) => update((d) => ({ ...d, sections: d.sections.map((x) => (x.key === s.key ? { ...x, heading: v.slice(0, 160) } : x)) })))}
              className="doc-field -ml-2 flex-1 px-2 py-1 text-[15px] font-extrabold"
              style={{ color: sectionHeadingColor }}
            />
            <button
              type="button"
              aria-label="Retirer cette section"
              onClick={() => update((d) => ({ ...d, sections: d.sections.filter((x) => x.key !== s.key) }))}
              className="flex size-7 items-center justify-center rounded-md text-[#B04A33] opacity-40 hover:bg-[#FBEDE9] group-hover:opacity-100 group-focus-within:opacity-100"
            >
              <X className="size-4" />
            </button>
          </div>
          <AutoTextarea
            aria-label={`Contenu de la section ${s.heading}`}
            value={s.body}
            maxLength={8000}
            placeholder="Contenu de la section"
            onChange={(e) => update((d) => ({ ...d, sections: d.sections.map((x) => (x.key === s.key ? { ...x, body: e.target.value } : x)) }), `sb-${s.key}`)}
            {...focusProps((v) => update((d) => ({ ...d, sections: d.sections.map((x) => (x.key === s.key ? { ...x, body: v.slice(0, 8000) } : x)) })))}
            className="-ml-2 mt-1 px-2 py-1 text-[13px] leading-relaxed text-[#3E4C59] placeholder:text-[#A9B6C2]"
            style={{ width: "calc(100% + 16px)" }}
          />
        </div>
      ))}

      {/* Conditions et notes */}
      <div style={{ padding: "22px 56px 0" }}>
        <h3 className="m-0 text-[15px] font-extrabold" style={{ color: sectionHeadingColor }}>Conditions</h3>
        <AutoTextarea
          aria-label="Conditions commerciales"
          value={doc.terms}
          maxLength={5000}
          placeholder="Validité, modalités de paiement, délais, périmètre et exclusions…"
          onChange={(e) => setField("terms", e.target.value)}
          {...focusProps((v) => setField("terms", v.slice(0, 5000)))}
          className="-ml-2 mt-1 px-2 py-1 text-[13px] leading-relaxed text-[#3E4C59] placeholder:text-[#A9B6C2]"
          style={{ width: "calc(100% + 16px)" }}
        />
      </div>
      <div style={{ padding: "16px 56px 0" }}>
        <h3 className="m-0 text-[15px] font-extrabold" style={{ color: sectionHeadingColor }}>Message au client</h3>
        <AutoTextarea
          aria-label="Message au client"
          value={doc.notes}
          maxLength={2000}
          placeholder="Message visible par le client (facultatif)"
          onChange={(e) => setField("notes", e.target.value)}
          {...focusProps((v) => setField("notes", v.slice(0, 2000)))}
          className="-ml-2 mt-1 px-2 py-1 text-[13px] leading-relaxed text-[#3E4C59] placeholder:text-[#A9B6C2]"
          style={{ width: "calc(100% + 16px)" }}
        />
      </div>

      {/* Insertion de bloc « / » */}
      <div className="relative" style={{ padding: "18px 56px 0" }}>
        <button
          type="button"
          aria-expanded={slashOpen}
          onClick={() => setSlashOpen((o) => !o)}
          onKeyDown={(e) => { if (e.key === "Escape") setSlashOpen(false); }}
          className="w-full rounded-[10px] border border-dashed border-[#D3DED8] bg-[#FAFCFB] px-3 py-2.5 text-left text-[#8696A6] hover:border-[#B9CCC1]"
        >
          Tapez « / » ou cliquez pour insérer un bloc…
        </button>
        {slashOpen ? (
          <div role="menu" aria-label="Insérer un bloc" className="absolute z-10 w-[300px] rounded-[14px] border border-[#E2E9E5] bg-white p-1.5 shadow-[0_16px_40px_rgba(18,38,58,.16)]" style={{ left: 56, top: 64 }}>
            <div className="px-2.5 py-1.5 text-[11px] tracking-[.06em]" style={{ color: MUTED }}>INSÉRER</div>
            {BLOCK_PRESETS.map((b) => (
              <button
                key={b.id}
                type="button"
                role="menuitem"
                onClick={() => { onAddPreset(b.id); setSlashOpen(false); }}
                className="flex w-full items-center gap-2.5 rounded-[10px] px-2.5 py-2 text-left hover:bg-[#F1F6F3]"
              >
                <span className="flex size-7 items-center justify-center rounded-lg bg-[#E3F1E9] text-xs font-bold text-[#1F5C43]">{b.glyph}</span>
                <span>
                  <span className="block text-[13px] font-semibold">{b.label}</span>
                  <span className="block text-[11px]" style={{ color: MUTED }}>{b.hint}</span>
                </span>
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-6" style={{ padding: "30px 56px 0" }}>
        <div>
          <div className="text-xs" style={{ color: MUTED }}>Pour {org.name}</div>
          <div className="mt-2 flex h-[70px] items-end rounded-[10px] border border-[#E2E9E5] px-2.5 py-2 text-xs" style={{ color: MUTED }}>Signature du prestataire</div>
        </div>
        <div>
          <div className="text-xs" style={{ color: MUTED }}>Bon pour accord — le client</div>
          <div className="mt-2 flex h-[70px] items-center justify-center rounded-[10px] border border-dashed border-[#B9CCC1] bg-[#FAFCFB] text-xs font-semibold text-[#23744C]">
            Acceptation en ligne à l’envoi
          </div>
        </div>
      </div>

      <div className="absolute inset-x-14 bottom-[18px] border-t border-[#E2E9E5] pt-2.5 text-center text-[10.5px]" style={{ color: MUTED }}>
        {footer}
      </div>
    </article>
  );
}

function TotalRow({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex justify-between">
      <span style={{ color: MUTED }}>{label}</span>
      <span className={cn("tabular-nums", strong && "font-semibold")}>{value}</span>
    </div>
  );
}

/** Variables proposées dans le panneau, avec leur valeur pour ce devis. */
export function variableValuesForPreview(input: {
  contact: StudioContact | null;
  number: string | null;
  totalLabel: string;
  expiryDate: string;
  organizationName: string;
  localeTag: string;
}) {
  const person = input.contact ? `${input.contact.firstName} ${input.contact.lastName ?? ""}`.trim() : null;
  const values: Record<string, string | null> = {
    "client.prenom": input.contact?.firstName ?? null,
    "client.nom": person,
    "client.entreprise": input.contact ? input.contact.companyName || person : null,
    "devis.numero": input.number,
    "devis.total": input.totalLabel,
    "devis.validite": input.expiryDate ? new Intl.DateTimeFormat(input.localeTag, { dateStyle: "long" }).format(new Date(`${input.expiryDate}T00:00:00`)) : null,
    "organisation.nom": input.organizationName,
  };
  return QUOTE_VARIABLES.map((v) => ({ key: v.key, label: v.label, value: values[v.key] ?? null }));
}

/** En-tête de la page selon le style du modèle (même logique que le moteur PDF). */
function TemplateHeader({
  header,
  accent,
  secondary,
  orgName,
  orgLine,
  docLabel,
  numberLabel,
  logo,
}: {
  header: ReturnType<typeof templateSpec>["header"];
  accent: string;
  secondary: string;
  orgName: string;
  orgLine: string;
  docLabel: string;
  numberLabel: string;
  logo: (size: number, inverted: boolean) => React.ReactNode;
}) {
  const onAccent = readableOn(accent);
  const onSecondary = readableOn(secondary);
  const identity = (inverted: boolean, color?: string) => (
    <div className="flex items-center gap-3.5">
      {logo(48, inverted)}
      <div>
        <div className="text-[17px] font-bold" style={color ? { color } : undefined}>{orgName}</div>
        <div className="text-xs" style={{ color: color ?? MUTED, opacity: color ? 0.85 : 1 }}>{orgLine}</div>
      </div>
    </div>
  );

  switch (header) {
    case "band":
    case "dark": {
      const bg = header === "band" ? accent : secondary;
      const fg = header === "band" ? onAccent : onSecondary;
      return (
        <div className="flex items-center justify-between gap-5" style={{ padding: "32px 56px", background: bg, color: fg, borderRadius: "4px 4px 0 0" }}>
          {identity(true, fg)}
          <div className="text-right">
            <div className="text-[26px] font-extrabold tracking-[.04em]" style={{ color: header === "dark" ? accent : fg }}>{docLabel}</div>
            <div className="text-xs opacity-85">{numberLabel}</div>
          </div>
        </div>
      );
    }
    case "split":
      return (
        <>
          <div className="flex items-start justify-between gap-5" style={{ padding: "44px 56px 0" }}>
            {identity(false)}
            <div className="text-right">
              <div className="text-[40px] font-extrabold leading-none" style={{ color: accent }}>Devis</div>
              <div className="mt-1.5 text-xs" style={{ color: MUTED }}>{numberLabel}</div>
            </div>
          </div>
          <div style={{ margin: "24px 56px 0", height: 4, borderRadius: 4, background: accent }} />
        </>
      );
    case "centered":
      return (
        <div className="flex flex-col items-center text-center" style={{ padding: "44px 56px 0" }}>
          {logo(48, false)}
          <div className="mt-2.5 text-lg font-bold" style={{ color: secondary }}>{orgName}</div>
          <div className="text-xs" style={{ color: MUTED }}>{orgLine}</div>
          <div className="mt-4 w-full" style={{ borderTop: `1px solid ${accent}`, borderBottom: `1px solid ${accent}`, padding: "8px 0", letterSpacing: ".28em" }}>
            <span className="text-[13px] font-bold" style={{ color: accent }}>{docLabel}</span>
            <span className="ml-3 text-xs tracking-normal" style={{ color: MUTED }}>{numberLabel}</span>
          </div>
        </div>
      );
    case "sidebar":
      return (
        <div className="flex items-start justify-between gap-5" style={{ padding: "44px 56px 0" }}>
          {identity(false)}
          <div className="text-right">
            <div className="text-[26px] font-extrabold tracking-[.04em]" style={{ color: accent }}>{docLabel}</div>
            <div className="text-xs" style={{ color: MUTED }}>{numberLabel}</div>
          </div>
        </div>
      );
    case "stripe":
      return (
        <>
          <div aria-hidden="true" style={{ height: 10, background: secondary, borderRadius: "4px 4px 0 0" }} />
          <div className="flex items-center justify-between gap-5 border-b border-[#E2E9E5]" style={{ margin: "0 56px", padding: "30px 0 20px" }}>
            {identity(false)}
            <div className="flex flex-col items-end gap-1.5">
              <span className="rounded-full px-3.5 py-1 text-xs font-bold tracking-[.12em]" style={{ background: accent, color: onAccent }}>{docLabel}</span>
              <span className="text-xs" style={{ color: MUTED }}>{numberLabel}</span>
            </div>
          </div>
        </>
      );
    case "block":
      return (
        <div className="relative" style={{ padding: "44px 56px 0", minHeight: 150 }}>
          {identity(false)}
          <div className="absolute right-0 top-0 flex h-[150px] w-[250px] flex-col items-end justify-center px-14" style={{ background: accent, color: onAccent, borderRadius: "0 4px 0 36px" }}>
            <div className="text-[30px] font-extrabold leading-none tracking-[.04em]">{docLabel}</div>
            <div className="mt-1.5 text-xs opacity-85">{numberLabel}</div>
          </div>
        </div>
      );
    case "rule":
    default:
      return (
        <div className="flex justify-between gap-5 border-b border-[#E2E9E5]" style={{ margin: "0 56px", padding: "48px 0 20px" }}>
          <div>
            <div className="text-[17px] font-bold" style={{ color: secondary }}>{orgName}</div>
            <div className="text-xs" style={{ color: MUTED }}>{orgLine}</div>
          </div>
          <div className="text-right text-xs" style={{ color: MUTED }}>
            <div className="text-[13px] font-bold tracking-[.12em]" style={{ color: secondary }}>{docLabel}</div>
            {numberLabel}
          </div>
        </div>
      );
  }
}
