import Link from "next/link";

const COLUMNS: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "Produit",
    links: [
      { label: "Fonctionnalités", href: "#fonctionnalites" },
      { label: "Solutions", href: "#solutions" },
      { label: "Comment ça marche", href: "#parcours" },
      { label: "Sécurité", href: "#securite" },
      { label: "Tarifs", href: "#tarifs" },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Rejoindre le pilote", href: "#tarifs" },
    ],
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
            <span className="font-display text-lg font-bold tracking-tight text-foreground">
              Aly<span className="text-accent">mero</span>
            </span>
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
