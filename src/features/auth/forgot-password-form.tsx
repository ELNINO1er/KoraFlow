"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import { authClient } from "@/server/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { AuthShell } from "./auth-shell";

const PHRASES = ["On vous reconnecte en douceur.", "Votre espace vous attend."];

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setLoading(true);
    // Réponse toujours neutre : on ne révèle jamais si l'e-mail existe.
    await authClient.requestPasswordReset({ email, redirectTo: "/reinitialiser-mot-de-passe" });
    setSent(true);
    setLoading(false);
  }

  return (
    <AuthShell phrases={PHRASES} tone="calm">
      {sent ? (
        <div className="flex flex-col items-start">
          <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
            <MailCheck className="size-6" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground">
            Vérifiez votre boîte mail
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Si un compte est associé à cette adresse, un e-mail de réinitialisation vient d&apos;être
            envoyé. Suivez le lien pour choisir un nouveau mot de passe.
          </p>
          <Link href="/login" className="mt-6 text-sm font-medium text-accent hover:underline">
            Retour à la connexion
          </Link>
        </div>
      ) : (
        <>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Mot de passe oublié
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Saisissez votre adresse e-mail : si un compte existe, vous recevrez un lien.
            </p>
          </div>
          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
            <Field id="email" label="Adresse e-mail">
              <Input
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </Field>
            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Envoyer le lien
            </Button>
            <Link href="/login" className="text-center text-sm text-muted-foreground hover:underline">
              Retour à la connexion
            </Link>
          </form>
        </>
      )}
    </AuthShell>
  );
}
