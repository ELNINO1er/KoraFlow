import Link from "next/link";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function DashboardNotFound() {
  return (
    <div className="mx-auto max-w-2xl">
      <Card className="flex flex-col items-center gap-3 p-10 text-center">
        <span className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
          <Compass className="size-6" />
        </span>
        <p className="font-display text-lg font-semibold text-foreground">Élément introuvable</p>
        <p className="max-w-md text-sm text-muted-foreground">
          Cet élément n’existe pas ou a été supprimé.
        </p>
        <Button asChild className="mt-2">
          <Link href="/dashboard">Retour au tableau de bord</Link>
        </Button>
      </Card>
    </div>
  );
}
