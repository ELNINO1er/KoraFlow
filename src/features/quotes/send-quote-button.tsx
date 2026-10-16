"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Check } from "lucide-react";
import { sendQuoteAction } from "@/features/quotes/actions";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function SendQuoteButton({
  id,
  hasEmail,
}: {
  id: string;
  hasEmail: boolean;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);

  function send() {
    startTransition(async () => {
      try {
        const result = await sendQuoteAction(id);
        if (!result.ok) {
          toast({ title: "Envoi du devis impossible", description: result.error ?? "Réessayez dans quelques instants.", variant: "danger" });
          return;
        }
        setSent(true);
        toast({ title: "Devis envoyé", description: "Le client a reçu le devis par e-mail.", variant: "success" });
        router.refresh();
      } catch {
        toast({ title: "Erreur inattendue", description: "Le devis n’a pas pu être envoyé. Réessayez dans quelques instants.", variant: "danger" });
      }
    });
  }

  return (
    <div>
      <Button
        type="button"
        size="sm"
        onClick={send}
        disabled={pending || !hasEmail}
        title={hasEmail ? undefined : "Le client n'a pas d'adresse e-mail"}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : sent ? (
          <Check className="size-4" />
        ) : (
          <Send className="size-4" />
        )}
        {sent ? "Envoyé" : "Envoyer au client"}
      </Button>
    </div>
  );
}
