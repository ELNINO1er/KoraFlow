"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2, Loader2, Check, Pencil } from "lucide-react";
import type { InvoiceStatus } from "@prisma/client";
import { manualInvoiceStatusesFor } from "@/lib/constants/invoices";
import {
  sendInvoiceAction,
  deleteInvoiceAction,
  changeInvoiceStatusAction,
  reopenInvoiceAction,
} from "@/features/invoices/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { FormSelect } from "@/components/ui/form-select";
import { SensitiveActionDialog } from "@/components/ui/sensitive-action-dialog";

export function SendInvoiceButton({ id, hasEmail }: { id: string; hasEmail: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        disabled={pending || !hasEmail}
        title={hasEmail ? undefined : "Le client n'a pas d'adresse e-mail"}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const r = await sendInvoiceAction(id);
            if (!r.ok) {
              setError(r.error ?? "Envoi impossible.");
              toast({ title: "Envoi de la facture impossible", description: r.error, variant: "danger" });
              return;
            }
            setSent(true);
            toast({ title: "Facture envoyée", description: "Le client a reçu le PDF et son accès sécurisé.", variant: "success" });
            router.refresh();
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : sent ? <Check className="size-4" /> : <Send className="size-4" />}
        {sent ? "Envoyée" : "Envoyer au client"}
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}

export function InvoiceStatusControl({ id, current }: { id: string; current: InvoiceStatus }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const statuses = manualInvoiceStatusesFor(current);
  return (
    <div className="flex flex-col items-end gap-1">
      <FormSelect
        value={current}
        disabled={pending || statuses.length <= 1}
        aria-label="Statut de la facture"
        options={statuses}
        className="h-9 w-auto min-w-40"
        onValueChange={(value) => {
          const next = value as InvoiceStatus;
          if (next === current) return;
          setError(null);
          startTransition(async () => {
            const result = await changeInvoiceStatusAction(id, next);
            if (!result.ok) {
              setError(result.error ?? "Changement impossible.");
              toast({ title: "Statut non modifié", description: result.error, variant: "danger" });
              return;
            }
            toast({ title: "Statut mis à jour", variant: "success" });
            router.refresh();
          });
        }}
      />
      {error ? <span className="max-w-64 text-right text-xs text-danger">{error}</span> : null}
    </div>
  );
}

export function DeleteInvoiceButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="text-danger hover:bg-danger/10"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Supprimer cette facture ?")) return;
        startTransition(async () => {
          await deleteInvoiceAction(id);
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      Supprimer
    </Button>
  );
}

export function CorrectInvoiceButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  return <><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => { setError(null); setOpen(true); }}><Pencil className="size-4" />Corriger</Button><SensitiveActionDialog open={open} onOpenChange={setOpen} title="Corriger cette facture ?" impact="La facture sera remise en brouillon. Vous pourrez visualiser vos changements, puis devrez envoyer la nouvelle version au client." confirmLabel="Ouvrir la modification" pending={pending} error={error} onConfirm={() => startTransition(async () => {
    const result = await reopenInvoiceAction(id);
    if (!result.ok) { setError(result.error ?? "Correction impossible."); return; }
    setOpen(false);
    toast({ title: "Facture remise en brouillon", description: "Vous pouvez maintenant la modifier puis la renvoyer.", variant: "success" });
    router.push(`/factures/${id}/modifier`);
    router.refresh();
  })} /></>;
}
