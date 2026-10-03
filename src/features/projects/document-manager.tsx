"use client";

import { useTransition } from "react";
import { Download, FileText, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { deleteDocumentAction } from "./actions";

interface DocumentItem {
  id: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  createdAtLabel: string;
  uploaderName: string | null;
}

function fileSize(size: number): string {
  if (size < 1024) return `${size} o`;
  if (size < 1024 * 1024) return `${Math.round(size / 1024)} Ko`;
  return `${(size / (1024 * 1024)).toFixed(1)} Mo`;
}

function DeleteDocumentButton({ id, projectId }: { id: string; projectId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="text-danger hover:bg-danger/10"
      aria-label="Supprimer le document"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Supprimer définitivement ce document ?")) return;
        startTransition(() => deleteDocumentAction(id, projectId));
      }}
    >
      {pending ? <Loader2 className="animate-spin" /> : <Trash2 />}
    </Button>
  );
}

export function DocumentManager({
  projectId,
  documents,
  canUpload,
  canDelete,
  message,
}: {
  projectId: string;
  documents: DocumentItem[];
  canUpload: boolean;
  canDelete: boolean;
  message?: { type: "success" | "error"; text: string };
}) {
  return (
    <div className="space-y-5">
      {message ? (
        <p
          role="status"
          className={`rounded-lg border px-3 py-2 text-sm ${
            message.type === "success"
              ? "border-success/30 bg-success/10 text-success"
              : "border-danger/30 bg-danger/10 text-danger"
          }`}
        >
          {message.text}
        </p>
      ) : null}

      {canUpload ? (
        <form
          action={`/api/projets/${projectId}/documents`}
          method="post"
          encType="multipart/form-data"
          className="flex flex-col gap-3 rounded-xl border border-dashed border-border bg-muted/30 p-4 sm:flex-row sm:items-end"
        >
          <div className="min-w-0 flex-1">
            <label htmlFor="project-document" className="mb-1.5 block text-sm font-medium text-foreground">
              Ajouter un document privé
            </label>
            <input
              id="project-document"
              name="file"
              type="file"
              required
              accept="application/pdf,image/png,image/jpeg,.pdf,.png,.jpg,.jpeg"
              className="block min-h-11 w-full rounded-lg border border-input bg-surface px-3 py-2 text-sm file:mr-3 file:rounded-md file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            />
            <p className="mt-1.5 text-xs text-muted-foreground">PDF, PNG ou JPEG · 10 Mo maximum.</p>
          </div>
          <Button type="submit" className="min-h-11 sm:min-h-10">
            <Upload /> Téléverser
          </Button>
        </form>
      ) : null}

      {documents.length === 0 ? (
        <div className="rounded-xl border border-border bg-muted/20 px-4 py-8 text-center">
          <FileText className="mx-auto mb-2 size-7 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Aucun document</p>
          <p className="mt-1 text-xs text-muted-foreground">Les livrables et pièces du projet apparaîtront ici.</p>
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border">
          {documents.map((document) => (
            <li key={document.id} className="flex min-w-0 items-center gap-3 p-3 sm:p-4">
              <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-muted text-muted-foreground">
                <FileText className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{document.originalName}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {fileSize(document.sizeBytes)} · {document.createdAtLabel}
                  {document.uploaderName ? ` · ${document.uploaderName}` : ""}
                </p>
              </div>
              <Button asChild variant="ghost" size="icon">
                <a href={`/api/documents/${document.id}`} aria-label={`Télécharger ${document.originalName}`}>
                  <Download />
                </a>
              </Button>
              {canDelete ? <DeleteDocumentButton id={document.id} projectId={projectId} /> : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
