/**
 * Page d'accueil provisoire (placeholder de fondation).
 * Sera remplacée par la vraie landing marketing au sprint dédié.
 * Sert ici à valider la charte graphique (tokens, polices) du Sprint 1.
 */
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 py-24 text-center">
      <span className="mb-6 inline-flex items-center rounded-full border border-border bg-surface px-4 py-1.5 text-sm font-medium text-muted-foreground">
        Fondation · Sprint 1
      </span>

      <h1 className="max-w-3xl font-display text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
        KoraFlow
      </h1>

      <p className="mt-4 max-w-xl text-lg text-muted-foreground">
        Votre entreprise, parfaitement orchestrée.
      </p>

      <p className="mt-2 max-w-xl text-base text-muted-foreground">
        Gérez vos clients, contrats, paiements et projets depuis un seul espace.
      </p>

      <div className="mt-10 flex flex-col gap-3 sm:flex-row">
        <span className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 font-medium text-primary-foreground">
          Espace administrateur
        </span>
        <span className="inline-flex h-11 items-center justify-center rounded-lg bg-accent px-6 font-medium text-accent-foreground">
          Portail client
        </span>
      </div>

      <p className="mt-12 text-sm text-muted-foreground">
        Environnement de développement — aucune donnée réelle.
      </p>
    </main>
  );
}
