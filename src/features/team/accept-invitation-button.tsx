"use client";

import { useState, useTransition } from "react";
import { Loader2, Check } from "lucide-react";
import { acceptInvitationAction } from "@/features/team/actions";
import { Button } from "@/components/ui/button";

export function AcceptInvitationButton({ token }: { token: string }) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-2">
      <Button
        type="button"
        className="w-full"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await acceptInvitationAction(token);
            // En cas de succès, l'action redirige. On n'atteint ici que sur erreur.
            if (result && !result.ok) setError(result.error ?? "Acceptation impossible.");
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Check className="size-4" />}
        Accepter l’invitation
      </Button>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
    </div>
  );
}
