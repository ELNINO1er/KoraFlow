"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, Loader2, Check } from "lucide-react";
import { sendQuoteAction } from "@/features/quotes/actions";
import { Button } from "@/components/ui/button";

export function SendQuoteButton({
  id,
  hasEmail,
}: {
  id: string;
  hasEmail: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function send() {
    setError(null);
    startTransition(async () => {
      const result = await sendQuoteAction(id);
      if (!result.ok) {
        setError(result.error ?? "Envoi impossible.");
        return;
      }
      setSent(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
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
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
