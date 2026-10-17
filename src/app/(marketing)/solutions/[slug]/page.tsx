import Link from "next/link";
import { notFound } from "next/navigation";
import { SOLUTIONS } from "@/lib/seo/solutions";
import { jsonLd, publicPageMetadata, SITE_URL } from "@/lib/seo/site";
import { Button } from "@/components/ui/button";

export const dynamicParams = false;
export function generateStaticParams() { return SOLUTIONS.map(({ slug }) => ({ slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = SOLUTIONS.find((entry) => entry.slug === slug);
  if (!page) notFound();
  return publicPageMetadata(page.title, page.description, `/solutions/${page.slug}`);
}

export default async function SolutionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = SOLUTIONS.find((entry) => entry.slug === slug);
  if (!page) notFound();
  return <article className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({
      "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Alymero", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: page.label, item: `${SITE_URL}/solutions/${page.slug}` },
      ],
    }) }} />
    <nav aria-label="Fil d’Ariane" className="flex flex-wrap gap-2 text-sm text-muted-foreground"><Link href="/" className="hover:underline">Alymero</Link><span aria-hidden>/</span><span aria-current="page">{page.label}</span></nav>
    <header className="max-w-3xl py-12">
      <p className="text-sm font-medium text-accent">Alymero · {page.label}</p>
      <h1 className="mt-4 font-display text-4xl font-bold tracking-tight sm:text-5xl">{page.title}</h1>
      <p className="mt-6 text-lg leading-relaxed text-muted-foreground">{page.intro}</p>
      <div className="mt-8 flex flex-wrap gap-3"><Button asChild><Link href="/register">Créer mon compte</Link></Button><Button asChild variant="outline"><Link href="/#fonctionnalites">Découvrir les fonctionnalités</Link></Button></div>
    </header>
    <div className="grid gap-5 md:grid-cols-3">{page.sections.map((section) => <section key={section.title} className="rounded-2xl border border-border bg-surface p-6">
      <h2 className="font-display text-xl font-semibold">{section.title}</h2><p className="mt-4 text-sm leading-7 text-muted-foreground">{section.text}</p>
    </section>)}</div>
    <section className="mt-16 max-w-3xl"><h2 className="font-display text-2xl font-bold">Questions fréquentes</h2>
      <div className="mt-6 divide-y divide-border">{page.questions.map((entry) => <details key={entry.question} className="py-5">
        <summary className="cursor-pointer font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{entry.question}</summary>
        <p className="mt-3 text-sm leading-7 text-muted-foreground">{entry.answer}</p>
      </details>)}</div>
    </section>
    <nav aria-label="Autres solutions Alymero" className="mt-14 rounded-2xl bg-muted p-6"><h2 className="font-display text-lg font-semibold">Poursuivre votre découverte</h2>
      <ul className="mt-4 flex flex-wrap gap-x-6 gap-y-4">{SOLUTIONS.filter((entry) => entry.slug !== slug).map((entry) => <li key={entry.slug}><Link className="text-sm font-medium text-accent underline-offset-4 hover:underline" href={`/solutions/${entry.slug}`}>{entry.label} →</Link></li>)}</ul>
    </nav>
  </article>;
}
