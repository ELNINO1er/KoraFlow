"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, FileText, Loader2, Redo2, Send, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/formatting/currency";
import { computeQuoteTotals } from "@/lib/quotes/totals";
import { collectUnsupportedCharacters } from "@/lib/pdf/winansi";
import { createQuoteAction, sendQuoteAction, updateQuoteAction, type CreateQuotePayload } from "@/features/quotes/actions";
import { useToast } from "@/components/ui/toast";
import { StudioPage, variableValuesForPreview, type FocusRegistrar } from "./studio-page";
import { StudioLibrary, StudioSettings } from "./studio-panels";
import { useDocHistory } from "./use-doc-history";
import { BLOCK_PRESETS, type SaveState, type StudioContact, type StudioDoc, type StudioOrganization, type StudioQuote, type StudioService } from "./types";

const AUTOSAVE_DELAY_MS = 1200;

/** Payload serveur depuis l'état du studio, ou raison pour laquelle le brouillon est incomplet. */
function buildPayload(doc: StudioDoc, minorUnits: number, isNew: boolean): { payload: Omit<CreateQuotePayload, "contactId"> } | { incomplete: string } {
  if (isNew && !doc.contactId) return { incomplete: "Choisissez un client pour enregistrer" };
  const lines = doc.lines.filter((l) => l.label.trim());
  if (lines.length === 0) return { incomplete: "Ajoutez une ligne pour enregistrer" };
  const sections = doc.sections
    .map((s) => ({ heading: s.heading.trim(), body: s.body.trim() }))
    .filter((s) => s.heading && s.body);
  return {
    payload: {
      expiryDate: doc.expiryDate || undefined,
      notes: doc.notes.trim() || undefined,
      terms: doc.terms.trim() || undefined,
      title: doc.title.trim() || undefined,
      introduction: doc.introduction.trim() || undefined,
      sections: sections.length ? sections : undefined,
      design: doc.design,
      discountType: doc.discountType,
      discountValue: doc.discountType ? doc.discountValue : 0,
      depositType: doc.depositType,
      depositValue: doc.depositType ? doc.depositValue : 0,
      items: lines.map((l) => ({
        serviceId: l.serviceId,
        description: l.detail.trim() ? `${l.label.trim()}\n${l.detail.trim()}` : l.label.trim(),
        unitPriceMinor: Math.round(l.unitPriceMajor * 10 ** minorUnits),
        quantity: l.quantity,
        taxRate: l.taxRate,
      })),
    },
  };
}

/**
 * Studio de document pour les devis : la page A4 est éditée sur place, entourée
 * d'une bibliothèque (blocs, catalogue, variables) et des réglages de mise en
 * page. Le brouillon s'enregistre automatiquement ; annuler/rétablir couvre
 * toutes les modifications de la session.
 */
export function QuoteStudio({
  quote,
  initialDoc,
  issueDateIso,
  contacts,
  services,
  organization,
  currency,
  localeTag,
  minorUnits,
}: {
  quote: StudioQuote | null;
  initialDoc: StudioDoc;
  issueDateIso: string;
  contacts: StudioContact[];
  services: StudioService[];
  organization: StudioOrganization;
  currency: string;
  localeTag: string;
  minorUnits: number;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const { doc, update, undo, redo, canUndo, canRedo } = useDocHistory<StudioDoc>(initialDoc);

  const [quoteId, setQuoteId] = useState<string | null>(quote?.id ?? null);
  const [number, setNumber] = useState<string | null>(quote?.number ?? null);
  const [saveState, setSaveState] = useState<SaveState>({ kind: "idle" });
  const [sending, startSending] = useTransition();

  const keyRef = useRef(10_000);
  const docRef = useRef(doc);
  const quoteIdRef = useRef(quoteId);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const savingRef = useRef<Promise<string | null> | null>(null);
  const queuedRef = useRef(false);
  const dirtyRef = useRef(false);
  const firstRenderRef = useRef(true);
  const focusRef = useRef<{ el: HTMLInputElement | HTMLTextAreaElement; apply: (value: string) => void } | null>(null);
  const caretRef = useRef<{ el: HTMLInputElement | HTMLTextAreaElement; pos: number } | null>(null);

  const isNew = quoteId === null;
  const issueDate = useMemo(() => new Date(`${issueDateIso}T00:00:00`), [issueDateIso]);

  const totals = computeQuoteTotals({
    lines: doc.lines.map((l) => ({ unitPriceMinor: Math.round(l.unitPriceMajor * 10 ** minorUnits), quantity: l.quantity, taxRate: l.taxRate })),
    discountType: doc.discountType,
    discountValue: doc.discountType ? doc.discountValue : 0,
    depositType: doc.depositType,
    depositValue: doc.depositType ? doc.depositValue : 0,
  });

  const unsupported = useMemo(
    () => collectUnsupportedCharacters([doc.title, doc.introduction, doc.notes, doc.terms, ...doc.sections.flatMap((s) => [s.heading, s.body]), ...doc.lines.flatMap((l) => [l.label, l.detail])]),
    [doc],
  );

  /* ------------------------------ Enregistrement ------------------------------ */

  const performSave = useCallback(async (): Promise<string | null> => {
    const current = docRef.current;
    const id = quoteIdRef.current;
    const built = buildPayload(current, minorUnits, id === null);
    if ("incomplete" in built) {
      setSaveState({ kind: "incomplete", message: built.incomplete });
      return id;
    }
    setSaveState({ kind: "saving" });
    dirtyRef.current = false;
    if (id === null) {
      const result = await createQuoteAction({ contactId: current.contactId, ...built.payload });
      if (!result.ok || !result.quoteId) {
        dirtyRef.current = true;
        setSaveState({ kind: "error", message: result.error ?? "Le devis n’a pas pu être créé." });
        return null;
      }
      quoteIdRef.current = result.quoteId;
      setQuoteId(result.quoteId);
      setNumber(result.quoteNumber ?? null);
      // L'adresse désigne désormais le brouillon créé, sur la MÊME route : un
      // rechargement le rouvre, et les actualisations ne remontent pas le studio.
      window.history.replaceState(null, "", `/devis/nouveau?id=${result.quoteId}`);
      setSaveState({ kind: "saved", at: Date.now() });
      return result.quoteId;
    }
    const result = await updateQuoteAction(id, built.payload);
    if (!result.ok) {
      dirtyRef.current = true;
      setSaveState({ kind: "error", message: result.error ?? "Le devis n’a pas pu être enregistré." });
      return id;
    }
    setSaveState({ kind: "saved", at: Date.now() });
    return id;
  }, [minorUnits]);

  /** Enregistre maintenant ; si un enregistrement est en cours, le suivant est mis en file. */
  const save = useCallback(async (): Promise<string | null> => {
    if (savingRef.current) {
      queuedRef.current = true;
      return savingRef.current;
    }
    const run = (async () => {
      try {
        let id = await performSave();
        while (queuedRef.current) {
          queuedRef.current = false;
          id = await performSave();
        }
        return id;
      } catch (error) {
        // Erreur inattendue (réseau, serveur) : le brouillon reste à enregistrer.
        console.error("quote.studio_save_failed", error);
        dirtyRef.current = true;
        queuedRef.current = false;
        setSaveState({ kind: "error", message: "Enregistrement impossible pour le moment. Nouvel essai à la prochaine modification." });
        return quoteIdRef.current;
      }
    })();
    savingRef.current = run;
    try {
      return await run;
    } finally {
      savingRef.current = null;
    }
  }, [performSave]);

  const flush = useCallback(async () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    return save();
  }, [save]);

  // Sauvegarde automatique, différée après la dernière modification.
  useEffect(() => {
    docRef.current = doc;
    if (firstRenderRef.current) {
      firstRenderRef.current = false;
      return;
    }
    dirtyRef.current = true;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      void save();
    }, AUTOSAVE_DELAY_MS);
  }, [doc, save]);

  // Avertit avant de quitter la page si des modifications ne sont pas enregistrées.
  useEffect(() => {
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current || savingRef.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, []);

  // Raccourcis : Ctrl/⌘ + S enregistre ; Ctrl/⌘ + Z / Maj + Z (hors champ de saisie) annule / rétablit.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const key = e.key.toLowerCase();
      if (key === "s") {
        e.preventDefault();
        void flush();
        return;
      }
      const target = e.target as HTMLElement | null;
      const inField = target?.closest("input, textarea, select, [contenteditable='true']");
      if (inField) return;
      if (key === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((key === "z" && e.shiftKey) || key === "y") { e.preventDefault(); redo(); }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flush, undo, redo]);

  /* ------------------------------ Actions d'édition ------------------------------ */

  const nextKey = () => (keyRef.current += 1);

  const addPreset = (presetId: string) => {
    const preset = BLOCK_PRESETS.find((b) => b.id === presetId);
    if (!preset) return;
    if (preset.line) {
      update((d) => ({ ...d, lines: [...d.lines, { key: nextKey(), serviceId: null, label: "", detail: "", quantity: 1, unitPriceMajor: 0, taxRate: d.lines[0]?.taxRate ?? 0 }] }));
      return;
    }
    update((d) => ({ ...d, sections: [...d.sections, { key: nextKey(), heading: preset.heading ?? preset.label, body: preset.body ?? "" }] }));
  };

  const addService = (s: StudioService) =>
    update((d) => ({
      ...d,
      lines: [
        ...d.lines,
        { key: nextKey(), serviceId: s.id, label: s.name, detail: s.description?.slice(0, 190) ?? "", quantity: 1, unitPriceMajor: s.priceMinor / 10 ** minorUnits, taxRate: s.taxRate },
      ],
    }));

  const registerFocus: FocusRegistrar = (el, apply) => {
    focusRef.current = { el, apply };
  };

  const insertVariable = (key: string) => {
    const token = `{${key}}`;
    const target = focusRef.current;
    if (!target || !target.el.isConnected) {
      update((d) => ({ ...d, introduction: d.introduction ? `${d.introduction} ${token}` : token }));
      return;
    }
    const { el, apply } = target;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? el.value.length;
    caretRef.current = { el, pos: start + token.length };
    apply(el.value.slice(0, start) + token + el.value.slice(end));
  };

  // Replace le curseur juste après la variable insérée, une fois la nouvelle valeur rendue
  // (avant, React réécrivait la valeur après coup et le curseur sautait).
  useLayoutEffect(() => {
    const caret = caretRef.current;
    if (!caret) return;
    caretRef.current = null;
    caret.el.focus();
    caret.el.setSelectionRange(caret.pos, caret.pos);
  }, [doc]);

  /* ------------------------------ Aperçu et envoi ------------------------------ */

  const openPreview = async () => {
    const id = await flush();
    if (!id) {
      toast({ title: "Aperçu indisponible", description: "Choisissez un client et ajoutez une ligne pour générer le PDF.", variant: "danger" });
      return;
    }
    window.open(`/api/devis/${id}/pdf`, "_blank", "noopener");
  };

  const sendToClient = () =>
    startSending(async () => {
      const id = await flush();
      if (!id || dirtyRef.current) {
        toast({ title: "Envoi impossible", description: "Le devis doit être enregistré (client et au moins une ligne).", variant: "danger" });
        return;
      }
      const result = await sendQuoteAction(id);
      if (!result.ok) {
        toast({ title: "Envoi du devis impossible", description: result.error ?? "Réessayez dans quelques instants.", variant: "danger" });
        return;
      }
      toast({ title: "Devis envoyé", description: "Le client a reçu le devis par e-mail.", variant: "success" });
      router.push(`/devis/${id}`);
      router.refresh();
    });

  /* ------------------------------ Rendu ------------------------------ */

  const contact = contacts.find((c) => c.id === doc.contactId) ?? null;
  const variables = variableValuesForPreview({
    contact,
    number,
    totalLabel: formatCurrency(totals.totalMinor, currency, localeTag),
    expiryDate: doc.expiryDate,
    organizationName: organization.name,
    localeTag,
  });
  const timeFmt = new Intl.DateTimeFormat(localeTag, { hour: "2-digit", minute: "2-digit" });
  const saveLabel =
    saveState.kind === "saving" ? "Enregistrement…"
      : saveState.kind === "saved" ? `Enregistré automatiquement à ${timeFmt.format(saveState.at)}`
        : saveState.kind === "incomplete" ? `Brouillon non enregistré · ${saveState.message}`
          : saveState.kind === "error" ? saveState.message
            : isNew ? "Nouveau brouillon" : "Toutes les modifications sont enregistrées";
  const saveDot =
    saveState.kind === "error" ? "bg-danger" : saveState.kind === "incomplete" ? "bg-warning" : saveState.kind === "saving" ? "bg-muted-foreground animate-pulse" : "bg-primary";

  const headerButton = "flex h-10 items-center gap-2 rounded-[10px] border border-border bg-surface px-3.5 text-sm text-foreground transition-colors hover:bg-muted disabled:opacity-50";

  return (
    <div className="flex h-dvh flex-col bg-background text-foreground">
      <header className="flex flex-wrap items-center gap-3 border-b border-border bg-surface px-5 py-3">
        <Link href={quoteId ? `/devis/${quoteId}` : "/devis"} aria-label={quoteId ? "Retour au devis" : "Retour aux devis"} className="flex size-10 items-center justify-center rounded-[10px] border border-border text-foreground transition-colors hover:bg-muted">
          <ArrowLeft className="size-[18px]" />
        </Link>
        <div className="flex min-w-0 flex-col">
          <div className="flex items-center gap-2">
            <span className="font-display text-base font-extrabold">{number ? `Devis ${number}` : "Nouveau devis"}</span>
            <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-semibold text-muted-foreground">Brouillon</span>
          </div>
          <div role="status" aria-live="polite" className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span className={cn("size-[7px] shrink-0 rounded-full", saveDot)} aria-hidden="true" />
            <span className="truncate">{saveLabel}</span>
          </div>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          <div className="flex overflow-hidden rounded-[10px] border border-border">
            <button type="button" aria-label="Annuler" title="Annuler (Ctrl + Z)" onClick={undo} disabled={!canUndo} className="flex size-10 items-center justify-center bg-surface text-foreground hover:bg-muted disabled:text-muted-foreground/50">
              <Undo2 className="size-[17px]" />
            </button>
            <button type="button" aria-label="Rétablir" title="Rétablir (Ctrl + Maj + Z)" onClick={redo} disabled={!canRedo} className="flex size-10 items-center justify-center border-l border-border bg-surface text-foreground hover:bg-muted disabled:text-muted-foreground/50">
              <Redo2 className="size-[17px]" />
            </button>
          </div>
          <button type="button" onClick={() => void openPreview()} className={headerButton}>
            <FileText className="size-4" />Aperçu PDF
          </button>
          <button
            type="button"
            onClick={sendToClient}
            disabled={sending}
            className="flex h-10 items-center gap-2 rounded-[10px] bg-primary px-4 text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-60"
          >
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}Envoyer au client
          </button>
        </div>
      </header>

      {unsupported.length ? (
        <p role="alert" className="border-b border-warm/30 bg-warm/10 px-5 py-2 text-xs text-warm-strong">
          Caractères non pris en charge par le PDF : <span className="font-mono">{unsupported.slice(0, 20).join(" ")}</span>. Remplacez-les avant l’envoi.
        </p>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto lg:flex-row lg:overflow-hidden">
        <StudioLibrary
          services={services}
          currency={currency}
          localeTag={localeTag}
          variables={variables}
          onAddPreset={addPreset}
          onAddService={addService}
          onInsertVariable={insertVariable}
        />

        <main className="flex min-w-0 flex-col items-center gap-3.5 overflow-x-auto bg-[#EEF2EF] px-6 pb-12 pt-7 lg:flex-1 lg:overflow-y-auto">
          <div className="flex items-center gap-2.5 text-xs text-muted-foreground">
            <span>A4</span><span aria-hidden="true">·</span><span>Les modifications s’enregistrent automatiquement</span>
          </div>
          <StudioPage
            doc={doc}
            update={update}
            org={organization}
            contacts={contacts}
            isNew={isNew}
            number={number}
            issueDate={issueDate}
            currency={currency}
            localeTag={localeTag}
            minorUnits={minorUnits}
            totals={totals}
            registerFocus={registerFocus}
            onAddPreset={addPreset}
          />
        </main>

        <StudioSettings
          doc={doc}
          update={update}
          issueDateIso={issueDateIso}
          currency={currency}
          localeTag={localeTag}
          minorUnits={minorUnits}
          totals={totals}
        />
      </div>
    </div>
  );
}
