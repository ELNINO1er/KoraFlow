import { redirect } from "next/navigation";
import { resolveSession, TRIAL_EXPIRED_PATH } from "@/server/auth/context";
import { resolvePlatformAdmin } from "@/server/auth/platform";
import { listUserOrganizations } from "@/server/services/organization-service";
import { listNotifications, unreadCount } from "@/server/services/notification-service";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { MobileNav } from "@/components/layout/mobile-nav";
import { ImpersonationBanner } from "@/features/admin/impersonation-banner";
import { TrialBanner } from "@/features/billing/trial-banner";

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
  if (session.status === "suspended") {
    redirect("/compte-suspendu");
  }
  if (session.status === "no-organization") {
    redirect("/create-organization");
  }
  if (session.status === "trial-expired") {
    redirect(TRIAL_EXPIRED_PATH);
  }

  const { context } = session;
  const [memberships, notifications, unread, platformAdmin] = await Promise.all([
    listUserOrganizations(context.user.id),
    listNotifications(context),
    unreadCount(context),
    resolvePlatformAdmin(),
  ]);
  const organizations = memberships.map((m) => ({
    id: m.organization.id,
    name: m.organization.name,
  }));
  const localeTag = context.organization.locale === "fr" ? "fr-FR" : context.organization.locale;

  return (
    <div className="flex h-dvh overflow-hidden bg-background">
      <Sidebar organization={context.organization} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {context.impersonatedBy ? <ImpersonationBanner /> : null}
        <TrialBanner trial={context.trial} localeTag={localeTag} />
        <Topbar
          user={context.user}
          organizations={organizations}
          activeOrgId={context.organizationId}
          notifications={notifications}
          unread={unread}
          localeTag={localeTag}
          isPlatformAdmin={Boolean(platformAdmin)}
        />
        <main className="min-h-0 flex-1 overflow-y-auto px-4 pb-24 pt-6 lg:px-8 lg:pb-8">
          {children}
        </main>
        <MobileNav />
      </div>
    </div>
  );
}
