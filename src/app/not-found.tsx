import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4 text-center">
      <span className="flex size-14 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Compass className="size-7" />
      </span>
      <h1 className="font-display text-2xl font-bold text-foreground">Page introuvable</h1>
      <p className="max-w-md text-sm text-muted-foreground">
        La page que vous cherchez n’existe pas ou a été déplacée.
      </p>
      <Button asChild>
        <Link href="/">Retour à l’accueil</Link>
      </Button>
    </main>
  );
}
