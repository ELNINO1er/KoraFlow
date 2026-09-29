"use client";

import * as React from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "./dialog";
import { Button } from "./button";
import { Textarea } from "./textarea";
import { Label } from "./label";
import { cn } from "@/lib/utils";

/**
 * Dialogue de confirmation pour une action sensible (suspension, suppression,
 * impersonation…). Affiche l'impact, exige éventuellement une justification,
 * gère le chargement et empêche la double soumission. Le rouge est réservé aux
 * actions réellement destructrices ; l'icône + le texte portent aussi le sens
 * (pas uniquement la couleur).
 */
export function SensitiveActionDialog({
  open,
  onOpenChange,
  title,
  impact,
  confirmLabel = "Confirmer",
  cancelLabel = "Annuler",
  danger = false,
  requireJustification = false,
  pending = false,
  error,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: React.ReactNode;
  impact: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  requireJustification?: boolean;
  pending?: boolean;
  error?: string | null;
  onConfirm: (justification: string) => void;
}) {
  const [justification, setJustification] = React.useState("");
  const canConfirm = !pending && (!requireJustification || justification.trim().length >= 3);

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (pending) return; // pas de fermeture pendant l'exécution
        if (!next) setJustification("");
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <div className="flex items-center gap-3">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl",
                danger ? "bg-danger/15 text-danger" : "bg-warning/15 text-warning",
              )}
            >
              <AlertTriangle className="size-5" />
            </span>
            <DialogTitle>{title}</DialogTitle>
          </div>
          <DialogDescription className="pt-1">{impact}</DialogDescription>
        </DialogHeader>

        {requireJustification ? (
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="sensitive-justification">Justification</Label>
            <Textarea
              id="sensitive-justification"
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Motif de cette action (tracé dans l'audit)…"
              rows={3}
            />
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={pending}
            onClick={() => onOpenChange(false)}
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={danger ? "destructive" : "default"}
            disabled={!canConfirm}
            onClick={() => onConfirm(justification.trim())}
          >
            {pending ? <Loader2 className="size-4 animate-spin" /> : null}
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
