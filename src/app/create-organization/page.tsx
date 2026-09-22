import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveSession } from "@/server/auth/context";
import { CreateOrgForm } from "@/features/organizations/create-org-form";

export const metadata: Metadata = { title: "Créer votre entreprise" };

export default async function CreateOrganizationPage() {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "ok") redirect("/dashboard");

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-background px-4 py-10">
      <div className="mb-8 text-center">
        <span className="font-display text-2xl font-bold tracking-tight text-primary">
          Kora<span className="text-accent">Flow</span>
        </span>
        <p className="text-sm text-muted-foreground">
          Votre entreprise, parfaitement orchestrée.
        </p>
      </div>
      <div className="w-full max-w-md">
        <CreateOrgForm />
      </div>
    </div>
  );
}
