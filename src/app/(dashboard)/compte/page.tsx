import type { Metadata } from "next";
import { PageHeader } from "@/components/app/page-header";
import { AccountForms } from "@/features/account/account-forms";
import { requireAuthContext } from "@/server/auth/context";

export const metadata: Metadata = { title: "Mon compte" };

export default async function AccountPage() {
  const ctx = await requireAuthContext();

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <PageHeader
        title="Mon compte"
        description="Gérez votre identité personnelle, votre adresse e-mail et votre mot de passe."
      />
      <AccountForms name={ctx.user.name ?? ""} email={ctx.user.email} />
      <p className="max-w-3xl text-sm text-muted-foreground">
        Le nom de votre organisation est distinct de votre nom personnel. Il reste affiché dans le
        sélecteur d’organisation en haut de l’écran.
      </p>
    </div>
  );
}
