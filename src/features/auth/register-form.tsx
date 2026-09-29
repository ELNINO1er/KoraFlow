"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { authClient } from "@/server/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import { AuthShell } from "./auth-shell";
import { AuthStepper } from "./auth-stepper";

const PHRASES = [
  "Créez votre espace en quelques minutes.",
  "Tout votre cycle commercial, réuni.",
  "Vos clients, contrats et paiements au même endroit.",
];

export function RegisterForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return;
    setError(null);
    if (password.length < 8) {
      setError("Le mot de passe doit comporter au moins 8 caractères.");
      return;
    }
    setLoading(true);
    const { error } = await authClient.signUp.email({ name, email, password });
    if (error) {
      setError(error.message ?? "Impossible de créer le compte.");
      setLoading(false);
      return;
    }
    router.push(`/verifier-email?email=${encodeURIComponent(email)}`);
  }

  return (
    <AuthShell phrases={PHRASES}>
      <AuthStepper current={0} />

      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Créer votre compte
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Commençons par vos informations. L&apos;entreprise, juste après.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        {error ? (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <Field id="name" label="Votre nom">
          <Input autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field id="email" label="Adresse e-mail">
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field id="password" label="Mot de passe" hint="Au moins 8 caractères.">
          <PasswordInput
            autoComplete="new-password"
            required
            minLength={8}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>
        <PasswordStrength value={password} />

        <Button type="submit" size="lg" disabled={loading} className="mt-1 w-full">
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Continuer
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Déjà inscrit ?{" "}
          <Link href="/login" className="font-medium text-accent hover:underline">
            Se connecter
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
