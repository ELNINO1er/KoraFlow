import Link from "next/link";
import { redirect } from "next/navigation";
import { resolveSession } from "@/server/auth/context";
import { Button } from "@/components/ui/button";

export default async function Home() {
  const session = await resolveSession();
  if (session.status === "ok") redirect("/dashboard");
  if (session.status === "no-organization") redirect("/create-organization");

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="mb-6 inline-flex items-center rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-muted-foreground">
        SaaS de gestion commerciale
      </span>

      <h1 className="max-w-3xl font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        Kora<span className="text-accent">Flow</span>
      </h1>
      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Votre entreprise, parfaitement orchestrée.
      </p>
      <p className="mt-2 max-w-xl text-base text-muted-foreground">
        Gérez vos clients, contrats, paiements et projets depuis un seul espace.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <Button asChild size="lg">
          <Link href="/register">Créer un compte</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/login">Se connecter</Link>
        </Button>
      </div>
    </main>
  );
}
