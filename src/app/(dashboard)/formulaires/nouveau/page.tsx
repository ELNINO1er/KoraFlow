import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { CreateFormForm } from "@/features/forms/create-form-form";

export const metadata: Metadata = { title: "Nouveau formulaire" };

export default async function NewFormPage() {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "forms.create")) redirect("/formulaires");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/formulaires" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Retour aux formulaires
        </Link>
        <h1 className="font-display text-2xl font-bold text-foreground">Nouveau formulaire</h1>
        <p className="text-sm text-muted-foreground">Vous ajouterez les champs à l’étape suivante.</p>
      </div>
      <CreateFormForm />
    </div>
  );
}
