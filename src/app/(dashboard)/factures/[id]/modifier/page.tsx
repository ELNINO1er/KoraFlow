import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { getInvoice } from "@/server/services/invoice-service";
import { minorUnitsFor } from "@/lib/formatting/currency";
import { parseSections } from "@/lib/documents/sections";
import { prisma } from "@/server/database/client";
import { InvoiceEditor } from "@/features/invoices/invoice-editor";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "invoices.update")) redirect("/factures");
  const { id } = await params;
  const [invoice, organization] = await Promise.all([getInvoice(ctx, id), prisma.organization.findUnique({ where: { id: ctx.organizationId }, select: { brandColor: true } })]);
  if (!invoice) notFound();
  if (invoice.status !== "DRAFT") redirect(`/factures/${id}`);
  const locale = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const clientName = invoice.contact.companyName ?? `${invoice.contact.firstName} ${invoice.contact.lastName ?? ""}`.trim();
  return <div className="mx-auto flex max-w-7xl flex-col gap-6"><div><Link href={`/factures/${id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Retour à la facture</Link><h1 className="font-display text-2xl font-bold">Personnaliser {invoice.number}</h1><p className="mt-1 text-sm text-muted-foreground">Modifiez le tableau, les calculs et l’habillage avant l’envoi au client.</p></div><InvoiceEditor locale={locale} minorUnits={minorUnitsFor(invoice.currency)} defaultColor={organization?.brandColor ?? "#12263a"} invoice={{ id: invoice.id, number: invoice.number, currency: invoice.currency, issueDate: new Intl.DateTimeFormat(locale, { dateStyle: "medium" }).format(invoice.issueDate), clientName, organization: { id: ctx.organizationId, name: ctx.organization.name, hasLogo: Boolean(ctx.organization.logoUrl) }, dueDate: invoice.dueDate?.toISOString().slice(0, 10) ?? "", notes: invoice.notes ?? "", title: invoice.title ?? "", introduction: invoice.introduction ?? "", terms: invoice.terms ?? "", sections: parseSections(invoice.sections), headerColor: invoice.headerColor ?? "", footerColor: invoice.footerColor ?? "", footerText: invoice.footerText ?? "", discountType: invoice.discountType, discountValue: invoice.discountValue, depositType: invoice.depositType, depositValue: invoice.depositValue, items: invoice.items.map((item) => ({ key: item.id, serviceId: item.serviceId, description: item.description, unitPriceMinor: item.unitPriceMinor, quantity: item.quantity, taxRate: item.taxRate })) }} /></div>;
}
