import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { DEFAULT_QUOTE_DESIGN, quoteDesignSchema } from "@/lib/quotes/design";
import { QuoteStudio } from "@/features/quotes/studio/quote-studio";
import { isoDay, loadExistingQuoteStudio, loadQuoteStudioData } from "@/features/quotes/studio/load-studio-data";

export const metadata: Metadata = { title: "Nouveau devis" };

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ contact?: string; id?: string }> }) {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "quotes.create")) redirect("/devis");
  const sp = await searchParams;

  // Brouillon déjà créé depuis cette page (`?id=`) : le studio reste sur la même
  // route, pour que les actualisations après enregistrement ne le remontent pas.
  if (sp.id) {
    const existing = await loadExistingQuoteStudio(ctx, sp.id);
    if (existing === "locked") redirect(`/devis/${sp.id}`);
    if (existing) return <QuoteStudio {...existing} />;
  }

  const data = await loadQuoteStudioData(ctx);
  const today = new Date();
  const expiry = new Date(today);
  expiry.setDate(expiry.getDate() + 30);
  // Couleur de marque de l'organisation comme accent par défaut, si elle est valide.
  const design = quoteDesignSchema.safeParse({ ...DEFAULT_QUOTE_DESIGN, accent: data.brandColor ?? DEFAULT_QUOTE_DESIGN.accent });
  const preselected = sp.contact && data.contacts.some((c) => c.id === sp.contact) ? sp.contact : "";

  return (
    <QuoteStudio
      quote={null}
      issueDateIso={isoDay(today)}
      initialDoc={{
        contactId: preselected,
        title: "",
        introduction: "",
        sections: [],
        lines: [],
        notes: "",
        terms: "",
        expiryDate: isoDay(expiry),
        discountType: null,
        discountValue: 0,
        depositType: null,
        depositValue: 0,
        design: design.success ? design.data : DEFAULT_QUOTE_DESIGN,
      }}
      contacts={data.contacts}
      services={data.services}
      organization={data.organization}
      currency={data.currency}
      localeTag={data.localeTag}
      minorUnits={data.minorUnits}
    />
  );
}
