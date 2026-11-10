import { redirect } from "next/navigation";
import { resolveSession, TRIAL_EXPIRED_PATH } from "@/server/auth/context";
import { ImpersonationBanner } from "@/features/admin/impersonation-banner";

/**
 * Shell plein écran des studios de document (sans menu latéral ni en-tête
 * applicatif). Mêmes gardes d'accès que l'espace de travail.
 */
export default async function StudioLayout({ children }: { children: React.ReactNode }) {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "suspended") redirect("/compte-suspendu");
  if (session.status === "no-organization") redirect("/create-organization");
  if (session.status === "trial-expired") redirect(TRIAL_EXPIRED_PATH);

  return (
    <>
      {session.context.impersonatedBy ? <ImpersonationBanner /> : null}
      {children}
    </>
  );
}
