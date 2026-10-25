import { redirect } from "next/navigation";
import { resolveSession } from "@/server/auth/context";
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

  return (
    <>
      {session.context.impersonatedBy ? <ImpersonationBanner /> : null}
      {children}
    </>
  );
}
