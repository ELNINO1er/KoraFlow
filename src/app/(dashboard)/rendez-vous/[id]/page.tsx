import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { getType } from "@/server/services/appointment-service";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { AvailabilityEditor } from "@/features/appointments/availability-editor";
import { DeleteTypeButton } from "@/features/appointments/delete-type-button";

export const metadata: Metadata = { title: "Type de rendez-vous" };

export default async function AppointmentTypePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireAuthContext();
  const { id } = await params;
  const type = await getType(ctx, id);
  if (!type) notFound();

  const canUpdate = can(ctx.role, "appointments.update");
  const canDelete = can(ctx.role, "appointments.delete");
  const appUrl = process.env.APP_URL ?? "";
  const publicUrl = `${appUrl}/rdv/${type.slug}`;

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <Link href="/rendez-vous" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Retour aux rendez-vous
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-foreground">{type.name}</h1>
            <Badge variant="outline">{type.durationMinutes} min</Badge>
          </div>
          <div className="flex items-center gap-2">
            <a href={`/rdv/${type.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
              <ExternalLink className="size-4" />
              Page de réservation
            </a>
            {canDelete ? <DeleteTypeButton id={type.id} /> : null}
          </div>
        </div>
        <div className="mt-2 rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-xs font-medium text-foreground">Lien public de réservation</p>
          <code className="break-all text-xs text-muted-foreground">{publicUrl}</code>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Disponibilités hebdomadaires</CardTitle>
          <p className="text-sm text-muted-foreground">Heures locales de l’organisation (UTC pour Abidjan).</p>
        </CardHeader>
        <CardContent>
          <AvailabilityEditor
            typeId={type.id}
            canEdit={canUpdate}
            availabilities={type.availabilities.map((a) => ({ dayOfWeek: a.dayOfWeek, startMinutes: a.startMinutes, endMinutes: a.endMinutes }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
