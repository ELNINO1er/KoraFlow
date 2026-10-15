import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrganizationSettingsForm } from "@/features/organizations/organization-settings-form";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { getOrganizationSettings } from "@/server/services/organization-service";

export const metadata: Metadata = { title: "Paramètres de l’organisation" };

const LOGO_MESSAGES: Record<string, { tone: string; text: string }> = {
  updated: { tone: "bg-success/10 text-success", text: "Le logo de l’entreprise a été mis à jour." },
  invalid: { tone: "bg-danger/10 text-danger", text: "Le fichier n’est pas un logo PNG ou JPEG valide." },
  "too-large": { tone: "bg-danger/10 text-danger", text: "Le logo dépasse la limite de 2 Mo." },
  missing: { tone: "bg-danger/10 text-danger", text: "Sélectionnez un fichier avant l’envoi." },
  failed: { tone: "bg-danger/10 text-danger", text: "Le logo n’a pas pu être enregistré. Vérifiez le stockage configuré." },
};

export default async function OrganizationSettingsPage({ searchParams }: { searchParams: Promise<{ logo?: string }> }) {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "organization.update")) redirect("/dashboard");

  const settings = await getOrganizationSettings(ctx);
  const logoResult = LOGO_MESSAGES[(await searchParams).logo ?? ""];

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Paramètres de l’organisation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez l’identité, la facturation et les préférences de {ctx.organization.name}.
        </p>
      </div>
      {logoResult ? <p role="status" className={`rounded-lg px-4 py-3 text-sm ${logoResult.tone}`}>{logoResult.text}</p> : null}
      <OrganizationSettingsForm initial={settings} />
    </div>
  );
}
