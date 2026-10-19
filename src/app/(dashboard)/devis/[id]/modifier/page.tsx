import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { getQuote } from "@/server/services/quote-service";
import { listServices } from "@/server/services/catalog-service";
import { minorUnitsFor } from "@/lib/formatting/currency";
import { parseSections } from "@/lib/documents/sections";
import { QuoteForm } from "@/features/quotes/quote-form";

export const metadata: Metadata = { title: "Modifier le devis" };

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "quotes.update")) redirect("/devis");
  const { id } = await params;
  const quote = await getQuote(ctx, id);
  if (!quote) notFound();
  // Seul un brouillon est modifiable (cohérent avec updateDraftQuote).
  if (quote.status !== "DRAFT") redirect(`/devis/${id}`);

  const minor = minorUnitsFor(ctx.organization.currency);
  const servicesRes = await listServices(ctx, { activeOnly: true, pageSize: 100 });
  const services = servicesRes.items.map((s) => ({ id: s.id, name: s.name, priceMinor: s.priceMinor, taxRate: s.taxRate, unit: s.unit }));
  const localeTag = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const contactLabel = quote.contact.companyName
    ? quote.contact.companyName
    : `${quote.contact.firstName} ${quote.contact.lastName ?? ""}`.trim();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link href={`/devis/${id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Retour au devis
        </Link>
        <h1 className="font-display text-2xl font-bold text-foreground">Modifier le devis {quote.number}</h1>
      </div>
      <QuoteForm
        contacts={[]}
        services={services}
        currency={ctx.organization.currency}
        localeTag={localeTag}
        minorUnits={minor}
        quote={{
          id: quote.id,
          contactLabel,
          title: quote.title,
          introduction: quote.introduction,
          notes: quote.notes,
          terms: quote.terms,
          expiryDate: quote.expiryDate ? quote.expiryDate.toISOString().slice(0, 10) : null,
          discountType: quote.discountType,
          discountValue: quote.discountValue,
          depositType: quote.depositType,
          depositValue: quote.depositValue,
          sections: parseSections(quote.sections),
          items: quote.items.map((it) => ({
            serviceId: it.serviceId,
            description: it.description,
            unitPriceMajor: it.unitPriceMinor / 10 ** minor,
            quantity: it.quantity,
            taxRate: it.taxRate,
          })),
        }}
      />
    </div>
  );
}
