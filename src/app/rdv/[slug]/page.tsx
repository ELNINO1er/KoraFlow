import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getAppointmentTypeBySlug } from "@/server/repositories/appointment-repository";
import { getBookingDays } from "@/server/services/appointment-service";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookingWidget } from "@/features/appointments/booking-widget";
import { PoweredByAlymero } from "@/components/brand/powered-by-alymero";
import { OrganizationBrand } from "@/components/brand/organization-brand";

export const metadata: Metadata = { title: "Réserver un rendez-vous" };

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const type = await getAppointmentTypeBySlug(slug);
  if (!type) notFound();

  const localeTag = type.organization.locale === "fr" ? "fr-FR" : type.organization.locale;
  const fmt = new Intl.DateTimeFormat(localeTag, { weekday: "short", day: "numeric", month: "short", timeZone: type.organization.timezone });
  const days = getBookingDays(14).map((iso) => ({ iso, label: fmt.format(new Date(`${iso}T00:00:00Z`)) }));

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <OrganizationBrand id={type.organization.id} name={type.organization.name} hasLogo={Boolean(type.organization.logoUrl)} className="justify-center text-lg text-primary" imageClassName="size-12" priority />
        <PoweredByAlymero className="justify-center" />
      </div>

      <Card>
        <CardHeader className="flex-row items-start justify-between">
          <div>
            <CardTitle className="text-xl">{type.name}</CardTitle>
            {type.description ? <p className="text-sm text-muted-foreground">{type.description}</p> : null}
          </div>
          <Badge variant="outline">{type.durationMinutes} min</Badge>
        </CardHeader>
        <CardContent>
          {type.availabilities.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucune disponibilité n’a encore été définie.</p>
          ) : (
            <BookingWidget slug={type.slug} days={days} timezone={type.organization.timezone} />
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Les horaires sont ceux de {type.organization.timezone}.
      </p>
    </main>
  );
}
