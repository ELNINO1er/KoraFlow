import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { resolveSession, TRIAL_EXPIRED_PATH } from "@/server/auth/context";
import { CreateOrgForm } from "@/features/organizations/create-org-form";

export const metadata: Metadata = { title: "Créer votre entreprise" };

export default async function CreateOrganizationPage() {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "suspended") redirect("/compte-suspendu");
  if (session.status === "ok") redirect("/dashboard");
  if (session.status === "trial-expired") redirect(TRIAL_EXPIRED_PATH);

  // La mise en page (deux volets) est portée par AuthShell dans CreateOrgForm.
  return <CreateOrgForm />;
}
