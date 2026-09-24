import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

export const metadata: Metadata = { title: "Compte suspendu" };

/**
 * Page d'information affichée quand un compte OU l'organisation active a été
 * suspendu(e) par un administrateur de plateforme. Aucune donnée sensible.
 */
export default function SuspendedAccountPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-surface p-8 text-center shadow-sm">
        <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-full bg-danger/15 text-danger">
          <ShieldAlert className="size-6" />
        </div>
        <h1 className="font-display text-xl font-bold text-foreground">
          Accès suspendu
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Votre compte ou votre organisation a été suspendu(e). L&apos;accès à
          l&apos;espace de travail est temporairement bloqué. Contactez
          l&apos;administrateur de la plateforme pour rétablir votre accès.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-10 items-center justify-center rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-muted"
        >
          Retour à la connexion
        </Link>
      </div>
    </div>
  );
}
