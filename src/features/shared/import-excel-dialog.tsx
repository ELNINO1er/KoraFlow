"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, Loader2, FileSpreadsheet, CheckCircle2, AlertTriangle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { FormSelect } from "@/components/ui/form-select";

export interface RowPreview {
  excelRow: number;
  data: Record<string, unknown>;
  status: "new" | "duplicate_in_file" | "existing" | "invalid";
  reasons: string[];
}
export interface ImportPreview {
  previewId: string;
  sheetNames: string[];
  sheetName: string;
  header: string[];
  mapping: Record<string, number>;
  missingRequired: string[];
  rows: RowPreview[];
  summary: { total: number; new: number; existing: number; duplicateInFile: number; invalid: number };
}
export interface ImportResult {
  created: number;
  skippedExisting: number;
  skippedDuplicateInFile: number;
  rejected: { excelRow: number; reasons: string[] }[];
  replayed: boolean;
}
type CommitAction = (input: {
  previewId: string; idempotencyKey: string; mapping?: Record<string, number>; preferredSheet?: string;
}) => Promise<{ ok: boolean; error?: string; result?: ImportResult }>;

const STATUS_LABEL: Record<RowPreview["status"], string> = {
  new: "À créer", existing: "Existe déjà (ignoré)", duplicate_in_file: "Doublon fichier (ignoré)", invalid: "Rejeté",
};
const STATUS_COLOR: Record<RowPreview["status"], string> = {
  new: "text-success", existing: "text-muted-foreground", duplicate_in_file: "text-warning", invalid: "text-danger",
};

export function ImportExcelDialog({
  title, entityNoun, previewUrl, templateUrl, fieldLabels, previewColumns, commitAction,
}: {
  title: string;
  entityNoun: string;
  previewUrl: string;
  templateUrl: string;
  fieldLabels: Record<string, string>;
  previewColumns: { key: string; label: string }[];
  commitAction: CommitAction;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [pending, startTransition] = useTransition();
  const idempotencyKey = useRef<string>("");

  function reset() { setFile(null); setPreview(null); setError(null); setResult(null); idempotencyKey.current = ""; }

  async function runPreview(selected: File, mapping?: Record<string, number>, sheet?: string) {
    setLoading(true); setError(null);
    try {
      const fd = new FormData();
      fd.append("file", selected);
      if (mapping) fd.append("mapping", JSON.stringify(mapping));
      if (sheet) fd.append("sheet", sheet);
      const res = await fetch(previewUrl, { method: "POST", body: fd });
      const json = await res.json();
      if (!json.ok) { setError(json.error ?? "Import impossible."); setPreview(null); }
      else setPreview(json.preview);
    } catch { setError("Échec de l'analyse du fichier."); }
    finally { setLoading(false); }
  }

  function onFile(f: File | null) { if (!f) return; setFile(f); setResult(null); void runPreview(f); }

  function remap(fieldKey: string, colIndex: string) {
    if (!file || !preview) return;
    const mapping = { ...preview.mapping };
    if (colIndex === "") delete mapping[fieldKey]; else mapping[fieldKey] = Number(colIndex);
    void runPreview(file, mapping, preview.sheetName);
  }

  function confirmImport() {
    if (!preview) return;
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    startTransition(async () => {
      const res = await commitAction({
        previewId: preview.previewId, idempotencyKey: idempotencyKey.current,
        mapping: preview.mapping, preferredSheet: preview.sheetName,
      });
      if (!res.ok) { setError(res.error ?? "Import impossible."); return; }
      setResult(res.result ?? null); router.refresh();
    });
  }

  function downloadErrorReport() {
    if (!preview) return;
    const lines = preview.rows.filter((r) => r.status === "invalid").map((r) => `Ligne ${r.excelRow} : ${r.reasons.join(" ; ")}`);
    const blob = new Blob([`Rapport d'erreurs d'import\n\n${lines.join("\n")}\n`], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "rapport-erreurs.txt"; a.click();
    URL.revokeObjectURL(url);
  }

  const canConfirm = Boolean(preview && preview.missingRequired.length === 0 && preview.summary.new > 0 && !pending);

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) reset(); }}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="size-4" />Importer Excel</Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader><DialogTitle>{title}</DialogTitle></DialogHeader>

        {!result ? (
          <div className="flex flex-col gap-4">
            <label
              className="flex cursor-pointer flex-col items-center gap-2 rounded-lg border border-dashed border-border p-6 text-center hover:bg-muted/50"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => { e.preventDefault(); onFile(e.dataTransfer.files?.[0] ?? null); }}
            >
              <FileSpreadsheet className="size-7 text-muted-foreground" />
              <span className="text-sm text-foreground">{file ? file.name : "Glissez un fichier .xlsx ici, ou cliquez pour choisir"}</span>
              <span className="text-xs text-muted-foreground">Besoin d’un gabarit ? <a href={templateUrl} className="text-accent underline">Télécharger le modèle</a></span>
              <input type="file" accept=".xlsx" className="hidden" onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
            </label>

            {loading ? <p className="flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="size-4 animate-spin" />Analyse…</p> : null}
            {error ? <p className="flex items-center gap-2 text-sm text-danger"><AlertTriangle className="size-4" />{error}</p> : null}

            {preview ? (
              <>
                {preview.sheetNames.length > 1 ? (
                  <div className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Feuille :</span>
                    <FormSelect
                      value={preview.sheetName}
                      onValueChange={(v) => file && runPreview(file, preview.mapping, v)}
                      aria-label="Feuille du classeur"
                      options={preview.sheetNames.map((s) => ({ value: s, label: s }))}
                      className="h-9 w-auto min-w-40"
                    />
                  </div>
                ) : null}

                <div>
                  <p className="mb-2 text-sm font-medium text-foreground">Correspondance des colonnes</p>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {Object.entries(fieldLabels).map(([key, label]) => (
                      <label key={key} className="flex items-center justify-between gap-2 text-sm">
                        <span className="text-muted-foreground">{label}</span>
                        <FormSelect
                          value={preview.mapping[key] == null ? "" : String(preview.mapping[key])}
                          onValueChange={(v) => remap(key, v)}
                          aria-label={`Colonne pour ${label}`}
                          options={[{ value: "", label: "— (ignorer)" }, ...preview.header.map((h, i) => ({ value: String(i), label: h || `Colonne ${i + 1}` }))]}
                          className="h-9 w-auto min-w-40"
                        />
                      </label>
                    ))}
                  </div>
                  {preview.missingRequired.length > 0 ? (
                    <p className="mt-2 flex items-center gap-2 text-sm text-danger"><AlertTriangle className="size-4" />Colonnes obligatoires manquantes : {preview.missingRequired.join(", ")}</p>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3 rounded-lg bg-muted/40 p-3 text-sm">
                  <span className="text-success">À créer : {preview.summary.new}</span>
                  <span className="text-muted-foreground">Existants ignorés : {preview.summary.existing}</span>
                  <span className="text-warning">Doublons fichier : {preview.summary.duplicateInFile}</span>
                  <span className="text-danger">Rejetés : {preview.summary.invalid}</span>
                  <span className="ml-auto text-foreground">Total : {preview.summary.total}</span>
                </div>

                <div className="max-h-60 overflow-auto rounded-lg border border-border">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-surface">
                      <tr className="border-b border-border text-left text-muted-foreground">
                        <th className="px-2 py-1">Ligne</th>
                        {previewColumns.map((c) => <th key={c.key} className="px-2 py-1">{c.label}</th>)}
                        <th className="px-2 py-1">État</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.rows.slice(0, 100).map((r) => (
                        <tr key={r.excelRow} className="border-b border-border last:border-0">
                          <td className="px-2 py-1 text-muted-foreground">{r.excelRow}</td>
                          {previewColumns.map((c) => <td key={c.key} className="px-2 py-1">{String(r.data[c.key] ?? "")}</td>)}
                          <td className={`px-2 py-1 ${STATUS_COLOR[r.status]}`} title={r.reasons.join(" ; ")}>{STATUS_LABEL[r.status]}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {preview.rows.length > 100 ? <p className="text-xs text-muted-foreground">Aperçu limité aux 100 premières lignes ; toutes seront traitées.</p> : null}
                {preview.summary.invalid > 0 ? <button type="button" onClick={downloadErrorReport} className="self-start text-sm text-accent underline">Télécharger le rapport d’erreurs</button> : null}
              </>
            ) : null}

            <DialogFooter>
              <Button type="button" onClick={confirmImport} disabled={!canConfirm}>
                {pending ? <Loader2 className="size-4 animate-spin" /> : <CheckCircle2 className="size-4" />}
                Importer {preview ? preview.summary.new : 0} {entityNoun}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            <p className="flex items-center gap-2 text-sm font-medium text-success"><CheckCircle2 className="size-5" />Import terminé{result.replayed ? " (déjà traité)" : ""}.</p>
            <ul className="text-sm text-foreground">
              <li>Créés : <strong>{result.created}</strong></li>
              <li>Existants ignorés : {result.skippedExisting}</li>
              <li>Doublons fichier ignorés : {result.skippedDuplicateInFile}</li>
              <li>Lignes rejetées : {result.rejected.length}</li>
            </ul>
            {result.rejected.length > 0 ? (
              <div className="max-h-40 overflow-auto rounded-lg border border-border p-2 text-xs text-danger">
                {result.rejected.map((r) => <div key={r.excelRow}>Ligne {r.excelRow} : {r.reasons.join(" ; ")}</div>)}
              </div>
            ) : null}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => reset()}>Importer un autre fichier</Button>
              <Button type="button" onClick={() => { setOpen(false); reset(); }}>Fermer</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
