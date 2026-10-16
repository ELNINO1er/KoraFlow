"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Trash2, Loader2 } from "lucide-react";
import { sendContractAction, deleteContractAction } from "@/features/contracts/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

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
