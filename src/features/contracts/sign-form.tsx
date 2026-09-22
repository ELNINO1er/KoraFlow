"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { PenLine, Loader2 } from "lucide-react";
import { signContractAction } from "@/features/contracts/public-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/** Formulaire de signature côté client (consentement explicite + nom). */
export function SignForm({ token }: { token: string }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!consent) {
      setError("Vous devez accepter les termes pour signer.");
      return;
    }
    startTransition(async () => {
      const result = await signContractAction(token, name.trim());
      if (!result.ok) {
        setError(result.error ?? "Signature impossible.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="signerName">Votre nom complet</Label>
        <Input
          id="signerName"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
          placeholder="Prénom et nom"
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-foreground">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => setConsent(e.target.checked)}
          className="mt-0.5 size-4 rounded border-input accent-[color:var(--color-primary)]"
        />
        <span>
          Je reconnais avoir lu le contrat ci-dessus et j’en accepte les termes.
          Ma signature électronique et son horodatage seront enregistrés.
        </span>
      </label>
      {error ? <p className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={pending || !consent || name.trim().length < 2}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <PenLine className="size-4" />}
        Signer le contrat
      </Button>
    </form>
  );
}
