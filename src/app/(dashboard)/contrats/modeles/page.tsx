import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { FileText, Plus, Pencil } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { listContractTemplates } from "@/server/services/contract-service";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { DuplicateTemplateButton, ArchiveTemplateButton } from "@/features/contracts/template-controls";

export const metadata: Metadata = { title: "Modèles de contrat" };

export default async function ContractTemplatesPage() {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "contracts.view")) notFound();
  const templates = await listContractTemplates(ctx);
  const canCreate = can(ctx.role, "contracts.create");
  const canUpdate = can(ctx.role, "contracts.update");
  const canDelete = can(ctx.role, "contracts.delete");

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Modèles de contrat</h1>
          <p className="text-sm text-muted-foreground">
            Aides à la rédaction réutilisables. À adapter au contexte — ne garantissent pas la validité juridique.
          </p>
        </div>
        {canCreate ? (
          <Button asChild>
            <Link href="/contrats/modeles/nouveau"><Plus className="size-4" />Nouveau modèle</Link>
          </Button>
        ) : null}
      </div>

      {templates.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted">
            <FileText className="size-6 text-muted-foreground" />
          </span>
          <p className="font-medium text-foreground">Aucun modèle</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Créez un modèle réutilisable avec des variables ({"{{client_name}}"}, {"{{quote_number}}"}…) pour accélérer la rédaction de vos contrats.
          </p>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {templates.map((t) => (
            <Card key={t.id} className="flex flex-wrap items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium text-foreground">{t.name}</p>
                <p className="truncate text-xs text-muted-foreground">{t.body.slice(0, 120)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {canUpdate ? (
                  <Button asChild variant="outline" size="sm">
                    <Link href={`/contrats/modeles/${t.id}`}><Pencil className="size-4" />Modifier</Link>
                  </Button>
                ) : null}
                {canCreate ? <DuplicateTemplateButton id={t.id} /> : null}
                {canDelete ? <ArchiveTemplateButton id={t.id} /> : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
