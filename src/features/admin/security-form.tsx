"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { enableAdminTwoFactorAction, verifyAdminTwoFactorAction } from "./actions";

export function AdminSecurityForm({ enabled }: { enabled: boolean }) {
  const [password, setPassword] = useState("");
  const [setup, setSetup] = useState<{ secret: string; backupCodes: string[] } | null>(null);
  const [code, setCode] = useState("");
  const [saved, setSaved] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (enabled || done) return <div className="rounded-xl border border-border bg-surface p-6">
    <p role="status" className="font-medium text-success">La double authentification est activée.</p>
    <p className="mt-2 text-sm text-muted-foreground">{done ? "Vos anciennes sessions ont été fermées. Reconnectez-vous avec votre mot de passe et le code de votre application." : "Votre accès est protégé par le code de votre application d’authentification. Conservez vos codes de secours en lieu sûr."}</p>
    <Link href={done ? "/login" : "/admin"} className="mt-4 inline-flex min-h-11 items-center text-sm text-accent hover:underline">{done ? "Se reconnecter →" : "Ouvrir la console →"}</Link>
  </div>;
  return <div className="rounded-xl border border-border bg-surface p-6">
    {!setup ? <form className="flex flex-col gap-4" onSubmit={(e) => {
      e.preventDefault();
      startTransition(async () => {
        setError(null);
        const result = await enableAdminTwoFactorAction(password);
        setPassword("");
        if (!result.ok || !result.totpURI || !result.backupCodes) { setError(result.error ?? "Activation impossible."); return; }
        const secret = new URL(result.totpURI).searchParams.get("secret");
        if (!secret) { setError("Clé d’activation indisponible."); return; }
        setSetup({ secret, backupCodes: result.backupCodes });
      });
    }}>
      <p className="text-sm text-muted-foreground">Préparez une application d’authentification (Google Authenticator, Microsoft Authenticator ou équivalent), puis confirmez votre mot de passe.</p>
      <Field id="admin-2fa-password" label="Votre mot de passe" required><Input type="password" autoComplete="current-password" required maxLength={128} value={password} onChange={(e) => setPassword(e.target.value)} disabled={pending} /></Field>
      <Button type="submit" disabled={pending}>{pending ? "Préparation…" : "Configurer la double authentification"}</Button>
    </form> : <form className="flex flex-col gap-5" onSubmit={(e) => {
      e.preventDefault();
      startTransition(async () => {
        setError(null);
        const result = await verifyAdminTwoFactorAction(code);
        setCode("");
        if (!result.ok) { setError(result.error ?? "Vérification impossible."); return; }
        setSetup(null); setDone(true);
      });
    }}>
      <div><h2 className="font-semibold">1. Ajoutez la clé dans votre application</h2>
        <p className="mt-1 text-sm text-muted-foreground">Choisissez « Saisir une clé de configuration », nommez le compte Alymero et choisissez une clé basée sur le temps.</p>
        <code className="mt-3 block select-all break-all rounded-lg bg-muted p-3 text-sm">{setup.secret}</code></div>
      <div><h2 className="font-semibold">2. Enregistrez vos codes de secours</h2>
        <p className="mt-1 text-sm text-muted-foreground">Chaque code remplace un code de l’application une seule fois. Ces codes ne seront plus affichés après validation.</p>
        <div className="mt-3 grid grid-cols-2 gap-2 rounded-lg bg-muted p-3">{setup.backupCodes.map((backup) => <code key={backup} className="select-all text-sm">{backup}</code>)}</div>
        <label className="mt-3 flex items-center gap-2 text-sm"><input type="checkbox" checked={saved} onChange={(e) => setSaved(e.target.checked)} required /> J’ai conservé mes codes en lieu sûr.</label></div>
      <Field id="admin-2fa-code" label="3. Code à 6 chiffres de l’application" required><Input value={code} onChange={(e) => setCode(e.target.value)} inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" maxLength={6} required disabled={pending} /></Field>
      <Button type="submit" disabled={pending || !saved}>{pending ? "Validation…" : "Activer et sécuriser mon accès"}</Button>
    </form>}
    {error ? <p role="alert" className="mt-4 text-sm text-danger">{error}</p> : null}
  </div>;
}
