import Link from "next/link";
import { BrandLogo } from "@/components/brand/brand-logo";
import { SOLUTIONS } from "@/lib/seo/solutions";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalités", href: "/#fonctionnalites" },
      { label: "Solutions", href: "/#solutions" },
      { label: "Comment ça marche", href: "/#parcours" },
      { label: "Sécurité", href: "/#securite" },
      { label: "Tarifs", href: "/#tarifs" },
    ],
  },
  {
    title: "Solutions",
    links: SOLUTIONS.map((entry) => ({ label: entry.label, href: `/solutions/${entry.slug}` })),
  },
  {
    title: "Compte",
    links: [
      { label: "Connexion", href: "/login" },
      { label: "Inscription", href: "/register" },
    ],
  },
];

export function Footer() {
  return (
    <footer className="border-t border-border bg-surface/40">
      <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div className="lg:col-span-1">
            <BrandLogo className="text-lg text-foreground" iconClassName="size-9" />
            <p className="mt-2 text-sm text-muted-foreground">Votre entreprise, parfaitement orchestrée.</p>
          </div>

          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-foreground">{col.title}</h3>
              <ul className="mt-3 space-y-2">
                {col.links.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="text-sm text-muted-foreground transition-colors hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 border-t border-border pt-6 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© 2026 Alymero. Tous droits réservés.</p>
          <p className="max-w-md text-xs">alymero.com · Plateforme de gestion commerciale tout-en-un.</p>
        </div>
      </div>
    </footer>
  );
}
