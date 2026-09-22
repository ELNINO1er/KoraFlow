import { redirect } from "next/navigation";
import { resolveSession } from "@/server/auth/context";
import { listUserOrganizations } from "@/server/services/organization-service";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";

/**
 * Shell de l'espace administrateur.
 * Garde d'accès côté serveur : redirige vers /login si non authentifié, vers
 * /create-organization si l'utilisateur n'a pas encore d'organisation.
 */
export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await resolveSession();

  if (session.status === "unauthenticated") {
    redirect("/login");
  }
  if (session.status === "no-organization") {
    redirect("/create-organization");
  }

  const { context } = session;
  const memberships = await listUserOrganizations(context.user.id);
  const organizations = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
  }));

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar
          user={context.user}
          organizations={organizations}
          activeOrgId={context.organizationId}
        />
        <main className="flex-1 px-4 pb-24 pt-6 lg:px-8 lg:pb-8">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
