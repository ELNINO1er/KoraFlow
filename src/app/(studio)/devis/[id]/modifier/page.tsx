import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { QuoteStudio } from "@/features/quotes/studio/quote-studio";
import { loadExistingQuoteStudio } from "@/features/quotes/studio/load-studio-data";

export const metadata: Metadata = { title: "Modifier le devis" };

export default async function EditQuotePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "quotes.update")) redirect("/devis");
  const { id } = await params;
  const props = await loadExistingQuoteStudio(ctx, id);
  if (!props) notFound();
  // Seul un brouillon est modifiable (cohérent avec updateDraftQuote).
  if (props === "locked") redirect(`/devis/${id}`);

  return <QuoteStudio {...props} />;
}
