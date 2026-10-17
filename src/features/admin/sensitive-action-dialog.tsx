"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import type { SensitiveConfirmation } from "@/lib/admin/validation";

export function SensitiveActionDialog({ title, target, description, onClose, onConfirm }: {
  title: string; target: string; description: string; onClose: () => void;
  onConfirm: (confirmation: SensitiveConfirmation) => Promise<{ ok: boolean; error?: string } | void>;
}) {
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
    <DialogContent onEscapeKeyDown={(e) => { if (pending) e.preventDefault(); }} onInteractOutside={(e) => { if (pending) e.preventDefault(); }}>
      <DialogHeader>
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription>{description}</DialogDescription>
      </DialogHeader>
      <p className="break-all rounded-lg bg-muted p-3 text-sm font-medium">Compte ou organisation : {target}</p>
      <form className="flex flex-col gap-4" onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          setError(null);
          const result = await onConfirm({ password, reason });
          setPassword("");
          if (result && !result.ok) { setError(result.error ?? "Action impossible."); return; }
          onClose();
          router.refresh();
        });
      }}>
        <Field id="admin-action-reason" label="Motif de l’intervention" required>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} minLength={5} maxLength={500} required disabled={pending} />
        </Field>
        <Field id="admin-action-password" label="Votre mot de passe" required>
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} required disabled={pending} />
        </Field>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>Annuler</Button>
          <Button type="submit" disabled={pending}>{pending ? "Vérification…" : "Confirmer l’opération"}</Button>
        </div>
      </form>
    </DialogContent>
  </Dialog>;
}
