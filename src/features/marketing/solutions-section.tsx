import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { SOLUTIONS } from "@/lib/seo/solutions";

export function SolutionsSection() {
  return <section aria-labelledby="solutions-guides-title" className="border-y border-border bg-surface/50 py-20">
    <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
      <p className="text-sm font-medium text-accent">Une gestion commerciale reliée à votre activité</p>
      <h2 id="solutions-guides-title" className="mt-3 max-w-2xl font-display text-3xl font-bold sm:text-4xl">Du premier contact à la livraison de vos prestations.</h2>
      <p className="mt-4 max-w-2xl text-muted-foreground">Découvrez comment Alymero accompagne les indépendants, agences et PME en Côte d’Ivoire et dans les équipes francophones.</p>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        {SOLUTIONS.map((page) => <Link key={page.slug} href={`/solutions/${page.slug}`} className="group rounded-2xl border border-border bg-background p-6 transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <h3 className="flex items-center justify-between gap-3 font-display text-lg font-semibold">{page.label}<ArrowUpRight aria-hidden className="size-5 shrink-0 text-accent" /></h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{page.intro}</p>
        </Link>)}
      </div>
    </div>
  </section>;
}
