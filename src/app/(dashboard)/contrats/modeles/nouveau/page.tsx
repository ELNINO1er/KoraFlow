import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { TemplateForm } from "@/features/contracts/template-form";

export const metadata: Metadata = { title: "Nouveau modèle de contrat" };

export default async function NewContractTemplatePage() {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "contracts.create")) notFound();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link href="/contrats/modeles" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Retour aux modèles
        </Link>
        <h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight text-foreground">Nouveau modèle</h1>
      </div>
      <TemplateForm />
    </div>
  );
}
