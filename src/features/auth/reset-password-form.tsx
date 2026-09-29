"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, ShieldCheck } from "lucide-react";
import { authClient } from "@/server/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { AuthShell } from "./auth-shell";

const PHRASES = ["Un nouveau départ, en sécurité.", "Votre accès se rétablit."];

export function ResetPasswordForm({ token, error }: { token?: string; error?: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const invalidLink = !token || Boolean(error);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setFormError(null);
    if (password.length < 8) {
      setFormError("Le mot de passe doit comporter au moins 8 caractères.");
      return;
    }
    if (password !== confirm) {
      setFormError("Les deux mots de passe ne correspondent pas.");
      return;
    }
    setLoading(true);
    const { error: resetError } = await authClient.resetPassword({ newPassword: password, token });
    if (resetError) {
      setFormError(resetError.message ?? "Lien invalide ou expiré.");
      setLoading(false);
      return;
    }
    setDone(true);
    setLoading(false);
    setTimeout(() => router.push("/login"), 1400);
  }

  return (
    <AuthShell phrases={PHRASES} tone="calm">
      {invalidLink ? (
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
            Lien invalide
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Ce lien de réinitialisation est invalide ou a expiré.
          </p>
          <Link
            href="/mot-de-passe-oublie"
            className="mt-6 inline-block text-sm font-medium text-accent hover:underline"
          >
            Demander un nouveau lien
          </Link>
        </div>
      ) : done ? (
        <div className="flex flex-col items-start">
          <span className="flex size-12 items-center justify-center rounded-full bg-success/15 text-success">
            <ShieldCheck className="size-6" />
          </span>
          <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground">
            Mot de passe mis à jour
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Redirection vers la connexion…</p>
        </div>
      ) : (
        <>
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
              Nouveau mot de passe
            </h1>
            <p className="mt-1.5 text-sm text-muted-foreground">
              Choisissez un nouveau mot de passe pour votre compte.
            </p>
          </div>
          <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
            {formError ? (
              <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
                {formError}
              </p>
            ) : null}
            <Field id="password" label="Nouveau mot de passe">
              <PasswordInput
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <PasswordStrength value={password} />
            <Field id="confirm" label="Confirmer le mot de passe">
              <PasswordInput
                autoComplete="new-password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
              />
            </Field>
            <Button type="submit" size="lg" disabled={loading} className="w-full">
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Mettre à jour le mot de passe
            </Button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
