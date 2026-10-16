"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2, Loader2, Pencil } from "lucide-react";
import { sendContractAction, deleteContractAction, reopenContractAction } from "@/features/contracts/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";
import { SensitiveActionDialog } from "@/components/ui/sensitive-action-dialog";

export function SendForSignatureButton({ id, resend = false }: { id: string; resend?: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const { toast } = useToast();
  return (
    <Button
      type="button"
      size="sm"
      onClick={() =>
        startTransition(async () => {
          const result = await sendContractAction(id);
          if (!result.ok) {
            toast({ title: "Envoi du contrat impossible", description: result.error, variant: "danger" });
            return;
          }
          toast({ title: "Contrat envoyé", description: "Le client a reçu le PDF et son lien sécurisé de signature.", variant: "success" });
          router.refresh();
        })
      }
      disabled={pending}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
      {pending ? "Envoi…" : resend ? "Renvoyer au client" : "Envoyer pour signature"}
    </Button>
  );
}

export function DeleteContractButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="text-danger hover:bg-danger/10"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Supprimer ce contrat ?")) return;
        startTransition(async () => {
          await deleteContractAction(id);
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      Supprimer
    </Button>
  );
}

export function CorrectContractButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  return <><Button type="button" size="sm" variant="outline" disabled={pending} onClick={() => { setError(null); setOpen(true); }}><Pencil className="size-4" />Corriger</Button><SensitiveActionDialog open={open} onOpenChange={setOpen} title="Corriger ce contrat ?" impact="Le contrat sera remis en brouillon et son lien de signature sera bloqué. Vous pourrez prévisualiser vos changements avant de renvoyer la nouvelle version au client." confirmLabel="Ouvrir la modification" pending={pending} error={error} onConfirm={() => startTransition(async () => {
    const result = await reopenContractAction(id);
    if (!result.ok) { setError(result.error ?? "Correction impossible."); return; }
    setOpen(false);
    toast({ title: "Contrat remis en brouillon", description: "Le client ne peut plus le signer tant qu’il n’est pas renvoyé.", variant: "success" });
    router.push(`/contrats/${id}/modifier`);
    router.refresh();
  })} /></>;
}
