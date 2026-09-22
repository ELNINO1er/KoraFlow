import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { ServiceForm } from "@/features/services/service-form";
import { createServiceAction } from "@/features/services/actions";

export const metadata: Metadata = { title: "Nouveau service" };

export default async function NewServicePage() {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "services.create")) redirect("/services");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/services"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour au catalogue
        </Link>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Nouveau service
        </h1>
      </div>
      <ServiceForm
        action={createServiceAction}
        submitLabel="Créer le service"
        currencyLabel={ctx.organization.currency}
      />
    </div>
  );
}
