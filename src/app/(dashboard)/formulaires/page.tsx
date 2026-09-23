import type { Metadata } from "next";
import Link from "next/link";
import { Plus, FormInput } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { listForms } from "@/server/services/form-service";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Formulaires" };

export default async function FormsPage() {
  const ctx = await requireAuthContext();
  const forms = await listForms(ctx);
  const canCreate = can(ctx.role, "forms.create");

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Formulaires</h1>
          <p className="text-sm text-muted-foreground">
            Formulaires publics — chaque soumission crée un prospect automatiquement
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/formulaires/nouveau">
              <Plus className="size-4" />
              Nouveau formulaire
            </Link>
          </Button>
        ) : null}
      </div>

      {forms.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted">
            <FormInput className="size-6 text-muted-foreground" />
          </span>
          <p className="font-medium text-foreground">Aucun formulaire</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Créez un formulaire public à partager (site, réseaux sociaux) pour capter des prospects.
          </p>
          {canCreate ? (
            <Button asChild className="mt-2">
              <Link href="/formulaires/nouveau">
                <Plus className="size-4" />
                Nouveau formulaire
              </Link>
            </Button>
          ) : null}
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {forms.map((f) => (
            <Link key={f.id} href={`/formulaires/${f.id}`}>
              <Card className="h-full p-5 transition-colors hover:border-accent">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{f.name}</p>
                  {f.active ? <Badge variant="success">Actif</Badge> : <Badge variant="outline">Inactif</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">/f/{f.slug}</p>
                <p className="mt-3 text-sm text-muted-foreground">
                  {f._count.submissions} soumission{f._count.submissions > 1 ? "s" : ""}
                </p>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
