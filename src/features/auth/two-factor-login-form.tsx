"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { authClient } from "@/server/auth/auth-client";
import { AuthShell } from "./auth-shell";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function TwoFactorLoginForm() {
  const [backup, setBackup] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return <AuthShell>
    <h1 className="font-display text-2xl font-bold">Vérifiez votre connexion</h1>
    <p className="mt-2 text-sm text-muted-foreground">{backup ? "Saisissez un de vos codes de secours non utilisé." : "Saisissez le code à 6 chiffres de votre application d’authentification."}</p>
    <form className="mt-6 flex flex-col gap-4" onSubmit={(e) => {
      e.preventDefault();
      startTransition(async () => {
        setError(null);
        const result = backup ? await authClient.twoFactor.verifyBackupCode({ code }) : await authClient.twoFactor.verifyTotp({ code });
        setCode("");
        if (result.error) { setError("Code invalide ou expiré. Réessayez, ou reconnectez-vous si la demande a expiré."); return; }
        router.replace("/connexion-reussie"); router.refresh();
      });
    }}>
      <Field id="login-2fa-code" label={backup ? "Code de secours" : "Code de vérification"} required>
        <Input value={code} onChange={(e) => setCode(e.target.value)} autoComplete="one-time-code" inputMode={backup ? "text" : "numeric"} pattern={backup ? undefined : "[0-9]{6}"} maxLength={backup ? 100 : 6} required disabled={pending} />
      </Field>
      {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
      <Button type="submit" disabled={pending}>{pending ? "Vérification…" : "Valider ma connexion"}</Button>
      <Button type="button" variant="ghost" disabled={pending} onClick={() => { setBackup(!backup); setCode(""); setError(null); }}>{backup ? "Utiliser mon application" : "Utiliser un code de secours"}</Button>
      <Link href="/login" className="text-center text-sm text-muted-foreground hover:underline">Revenir à la connexion</Link>
    </form>
  </AuthShell>;
}
