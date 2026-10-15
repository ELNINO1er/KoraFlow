import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert, ExternalLink } from "lucide-react";
import { requirePlatformAdmin } from "@/server/auth/platform";
import { AdminNav } from "@/features/admin/admin-nav";
import { BrandLogo } from "@/components/brand/brand-logo";

export const metadata: Metadata = {
  title: { default: "Console plateforme", template: "%s · Console plateforme" },
};

// La console interroge la base par requête (données de toutes les organisations)
// et dépend de la session : jamais de pré-rendu statique au build.
export const dynamic = "force-dynamic";

/**
 * Shell de la console d'administration de PLATEFORME.
 * Garde d'accès stricte : seul un admin plateforme (non suspendu) entre ici ;
 * tout autre visiteur reçoit un 404 (l'existence de la console n'est pas révélée).
 * Habillage volontairement distinct (bandeau sombre) pour signaler que l'on
 * opère AU-DESSUS des organisations.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const admin = await requirePlatformAdmin();

  return (
    <div className="min-h-screen bg-background">
      <header className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 py-3 lg:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <BrandLogo iconOnly priority iconClassName="size-9" />
              <div>
                <p className="font-display text-sm font-bold leading-tight">
                  Console plateforme
                </p>
                <p className="text-[11px] leading-tight text-white/60">
                  <span className="inline-flex items-center gap-1">
                    <ShieldAlert className="size-3" />
                    Alymero · super administration
                  </span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden text-xs text-white/70 sm:inline">
                {admin.email}
              </span>
              <Link
                href="/dashboard"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium text-white/90 hover:bg-white/10"
              >
                <ExternalLink className="size-3.5" />
                Retour à l&apos;app
              </Link>
            </div>
          </div>
          <AdminNav />
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6 lg:px-8">{children}</main>
    </div>
  );
}
