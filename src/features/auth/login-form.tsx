"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Check } from "lucide-react";
import { authClient } from "@/server/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { PasswordInput } from "@/components/ui/password-input";
import { AuthShell } from "./auth-shell";

export function LoginForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<"idle" | "loading" | "success">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return; // anti double-soumission
    setError(null);
    setStatus("loading");
    const { error } = await authClient.signIn.email({ email, password, rememberMe: remember });
    if (error) {
      setError(
        error.code === "EMAIL_NOT_VERIFIED"
          ? "Veuillez d'abord confirmer votre adresse e-mail (lien reçu par courriel)."
          : (error.message ?? "Identifiants invalides."),
      );
      setStatus("idle");
      return;
    }
    setStatus("success");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <AuthShell>
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Heureux de vous revoir
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Connectez-vous pour reprendre votre activité.
        </p>
      </div>

      <form onSubmit={onSubmit} className="mt-8 flex flex-col gap-4">
        {error ? (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <Field id="email" label="Adresse e-mail">
          <Input
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </Field>

        <Field id="password" label="Mot de passe">
          <PasswordInput
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-sm text-muted-foreground">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="size-4 rounded border-input accent-[var(--color-accent)]"
            />
            Se souvenir de moi
          </label>
          <Link href="/mot-de-passe-oublie" className="text-sm font-medium text-accent hover:underline">
            Mot de passe oublié ?
          </Link>
        </div>

        <Button type="submit" size="lg" disabled={status !== "idle"} className="mt-1 w-full">
          {status === "loading" ? <Loader2 className="size-4 animate-spin" /> : null}
          {status === "success" ? <Check className="size-4" /> : null}
          {status === "success" ? "Connexion réussie" : "Se connecter"}
        </Button>

        <p className="text-center text-sm text-muted-foreground">
          Pas encore de compte ?{" "}
          <Link href="/register" className="font-medium text-accent hover:underline">
            Créer un compte
          </Link>
        </p>
      </form>
    </AuthShell>
  );
}
