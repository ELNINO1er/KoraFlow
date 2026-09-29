"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck, RefreshCw } from "lucide-react";
import { authClient } from "@/server/auth/auth-client";
import { Button } from "@/components/ui/button";
import { AuthShell } from "./auth-shell";
import { AuthStepper } from "./auth-stepper";

const PHRASES = ["Encore une étape.", "Votre flux est presque prêt."];

function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!local || !domain) return email;
  const head = local.slice(0, 1);
  return `${head}${"•".repeat(Math.max(1, local.length - 1))}@${domain}`;
}

export function VerifyEmailForm({ email }: { email: string }) {
  const [cooldown, setCooldown] = useState(0);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Décompte du délai avant un nouveau renvoi (setState dans un timer = ok).
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  async function resend() {
    if (sending || cooldown > 0 || !email) return;
    setError(null);
    setMessage(null);
    setSending(true);
    const { error } = await authClient.sendVerificationEmail({
      email,
      callbackURL: "/dashboard",
    });
    setSending(false);
    if (error) {
      setError(error.message ?? "Renvoi impossible pour le moment.");
      return;
    }
    setMessage("Un nouveau lien vient d'être envoyé.");
    setCooldown(30);
  }

  return (
    <AuthShell phrases={PHRASES} tone="calm">
      <AuthStepper current={1} />

      <div className="flex flex-col items-start">
        <span className="flex size-12 items-center justify-center rounded-full bg-accent/10 text-accent">
          <MailCheck className="size-6" />
        </span>
        <h1 className="mt-4 font-display text-2xl font-bold tracking-tight text-foreground">
          Vérifiez votre adresse e-mail
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Nous avons envoyé un lien de confirmation
          {email ? (
            <>
              {" "}
              à <span className="font-medium text-foreground">{maskEmail(email)}</span>
            </>
          ) : null}
          . Cliquez dessus pour activer votre compte et accéder à votre espace.
        </p>
      </div>

      <div className="mt-8 flex flex-col gap-3">
        {message ? (
          <p role="status" className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            {message}
          </p>
        ) : null}
        {error ? (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {error}
          </p>
        ) : null}

        <Button
          type="button"
          variant="outline"
          size="lg"
          onClick={resend}
          disabled={sending || cooldown > 0 || !email}
          className="w-full"
        >
          {sending ? <Loader2 className="size-4 animate-spin" /> : <RefreshCw className="size-4" />}
          {cooldown > 0 ? `Renvoyer le lien (${cooldown}s)` : "Renvoyer le lien"}
        </Button>

        <div className="flex items-center justify-between text-sm">
          <Link href="/register" className="text-muted-foreground hover:text-foreground hover:underline">
            Changer d&apos;adresse
          </Link>
          <Link href="/login" className="font-medium text-accent hover:underline">
            J&apos;ai confirmé, me connecter
          </Link>
        </div>
      </div>
    </AuthShell>
  );
}
