import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, Plus } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { listContacts } from "@/server/services/contact-service";
import { listServices } from "@/server/services/catalog-service";
import { minorUnitsFor } from "@/lib/formatting/currency";
import { QuoteForm } from "@/features/quotes/quote-form";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const metadata: Metadata = { title: "Nouveau devis" };

export default async function NewQuotePage() {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "quotes.create")) redirect("/devis");

  const [contactsRes, servicesRes] = await Promise.all([
    listContacts(ctx, { pageSize: 100 }),
    listServices(ctx, { activeOnly: true, pageSize: 100 }),
  ]);

  const contacts = contactsRes.items.map((c) => ({
    id: c.id,
    label:
      `${c.firstName} ${c.lastName ?? ""}`.trim() +
      (c.companyName ? ` — ${c.companyName}` : ""),
  }));
  const services = servicesRes.items.map((s) => ({
    id: s.id,
    name: s.name,
    priceMinor: s.priceMinor,
    taxRate: s.taxRate,
    unit: s.unit,
  }));

  const localeTag =
    ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link
          href="/devis"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour aux devis
        </Link>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Nouveau devis
        </h1>
      </div>

      {contacts.length === 0 ? (
        <Card className="flex flex-col items-center gap-3 p-10 text-center">
          <p className="font-medium text-foreground">Aucun client disponible</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Créez d’abord un client avant d’établir un devis.
          </p>
          <Button asChild className="mt-2">
            <Link href="/clients/nouveau">
              <Plus className="size-4" />
              Nouveau client
            </Link>
          </Button>
        </Card>
      ) : (
        <QuoteForm
          contacts={contacts}
          services={services}
          currency={ctx.organization.currency}
          localeTag={localeTag}
          minorUnits={minorUnitsFor(ctx.organization.currency)}
        />
      )}
    </div>
  );
}
