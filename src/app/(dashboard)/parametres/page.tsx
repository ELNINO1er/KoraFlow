import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { OrganizationSettingsForm } from "@/features/organizations/organization-settings-form";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { getOrganizationSettings } from "@/server/services/organization-service";

export const metadata: Metadata = { title: "Paramètres de l’organisation" };

export default async function OrganizationSettingsPage() {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "organization.update")) redirect("/dashboard");

  const settings = await getOrganizationSettings(ctx);

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6 pb-8">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Paramètres de l’organisation</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Gérez l’identité, la facturation et les préférences de {ctx.organization.name}.
        </p>
      </div>
      <OrganizationSettingsForm initial={settings} />
    </div>
  );
}
