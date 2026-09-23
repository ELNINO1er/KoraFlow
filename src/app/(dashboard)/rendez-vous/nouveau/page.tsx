import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { CreateTypeForm } from "@/features/appointments/create-type-form";

export const metadata: Metadata = { title: "Nouveau type de rendez-vous" };

export default async function NewAppointmentTypePage() {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "appointments.create")) redirect("/rendez-vous");

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <Link href="/rendez-vous" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Retour aux rendez-vous
        </Link>
        <h1 className="font-display text-2xl font-bold text-foreground">Nouveau type de rendez-vous</h1>
        <p className="text-sm text-muted-foreground">Vous définirez les disponibilités à l’étape suivante.</p>
      </div>
      <CreateTypeForm />
    </div>
  );
}
