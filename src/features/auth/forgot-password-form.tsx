"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { authClient } from "@/server/auth/auth-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

export function ForgotPasswordForm() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    // On appelle toujours le même flux ; on n'indique jamais si l'e-mail existe.
    await authClient.requestPasswordReset({
      email,
      redirectTo: "/reinitialiser-mot-de-passe",
    });
    setSent(true);
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Mot de passe oublié</CardTitle>
        <CardDescription>
          Saisissez votre adresse e-mail : si un compte existe, vous recevrez un
          lien de réinitialisation.
        </CardDescription>
      </CardHeader>
      {sent ? (
        <CardContent className="flex flex-col gap-3">
          <p className="rounded-lg bg-success/10 px-3 py-2 text-sm text-success">
            Si un compte est associé à cette adresse, un e-mail de
            réinitialisation vient d&apos;être envoyé. Vérifiez votre boîte de
            réception.
          </p>
          <Link href="/login" className="text-sm font-medium text-accent hover:underline">
            Retour à la connexion
          </Link>
        </CardContent>
      ) : (
        <form onSubmit={onSubmit}>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Adresse e-mail</Label>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter className="flex-col gap-3 pt-0">
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="size-4 animate-spin" /> : null}
              Envoyer le lien
            </Button>
            <Link href="/login" className="text-sm text-muted-foreground hover:underline">
              Retour à la connexion
            </Link>
          </CardFooter>
        </form>
      )}
    </Card>
  );
}
