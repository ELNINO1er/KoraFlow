import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { ContactForm } from "@/features/contacts/contact-form";

export const metadata: Metadata = { title: "Nouveau contact" };

export default async function NewContactPage() {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "contacts.create")) redirect("/clients");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link
          href="/clients"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour aux clients
        </Link>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Nouveau contact
        </h1>
      </div>
      <ContactForm />
    </div>
  );
}
