import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { getContact } from "@/server/services/contact-service";
import { updateContactAction } from "@/features/contacts/actions";
import { ContactForm } from "@/features/contacts/contact-form";

export const metadata: Metadata = { title: "Modifier le contact" };

export default async function EditContactPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "contacts.update")) redirect("/clients");

  const { id } = await params;
  const result = await getContact(ctx, id);
  if (!result) notFound();
  const { contact } = result;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href={`/clients/${id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Retour à la fiche
        </Link>
        <h1 className="font-display text-2xl font-bold text-foreground">Modifier le contact</h1>
      </div>
      <ContactForm
        action={updateContactAction.bind(null, id)}
        submitLabel="Enregistrer les modifications"
        cancelHref={`/clients/${id}`}
        defaultValues={{
          firstName: contact.firstName,
          lastName: contact.lastName ?? "",
          companyName: contact.companyName ?? "",
          source: contact.source ?? "",
          email: contact.email ?? "",
          phone: contact.phone ?? "",
          type: contact.type,
          stage: contact.stage,
          notes: contact.notes ?? "",
        }}
      />
    </div>
  );
}
