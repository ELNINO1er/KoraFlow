import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { getService } from "@/server/services/catalog-service";
import { minorUnitsFor } from "@/lib/formatting/currency";
import { ServiceForm } from "@/features/services/service-form";
import { updateServiceAction } from "@/features/services/actions";
import { DeleteServiceButton } from "@/features/services/delete-service-button";

export const metadata: Metadata = { title: "Modifier un service" };

export default async function EditServicePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "services.update")) redirect("/services");

  const { id } = await params;
  const service = await getService(ctx, id);
  if (!service) notFound();

  const minorUnits = minorUnitsFor(ctx.organization.currency);
  const priceMajor = service.priceMinor / 10 ** minorUnits;
  const boundAction = updateServiceAction.bind(null, service.id);
  const canDelete = can(ctx.role, "services.delete");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <Link
            href="/services"
            className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Retour au catalogue
          </Link>
          <h1 className="font-display text-2xl font-bold text-foreground">
            {service.name}
          </h1>
        </div>
        {canDelete ? <DeleteServiceButton id={service.id} /> : null}
      </div>

      <ServiceForm
        action={boundAction}
        submitLabel="Enregistrer les modifications"
        currencyLabel={ctx.organization.currency}
        defaultValues={{
          name: service.name,
          description: service.description ?? "",
          priceMajor,
          unit: service.unit,
          category: service.category ?? "",
          taxRate: service.taxRate,
          estimatedDurationMinutes:
            service.estimatedDurationMinutes != null
              ? String(service.estimatedDurationMinutes)
              : "",
          active: service.active,
        }}
      />
    </div>
  );
}
