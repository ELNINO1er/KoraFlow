import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { getContractTemplate } from "@/server/services/contract-service";
import { TemplateForm } from "@/features/contracts/template-form";

export const metadata: Metadata = { title: "Modèle de contrat" };

export default async function EditContractTemplatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "contracts.update")) notFound();
  const { id } = await params;
  const template = await getContractTemplate(ctx, id);
  if (!template) notFound();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link href="/contrats/modeles" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Retour aux modèles
        </Link>
        <h1 className="font-display text-2xl font-bold text-foreground">Modifier le modèle</h1>
      </div>
      <TemplateForm template={{ id: template.id, name: template.name, body: template.body }} />
    </div>
  );
}
