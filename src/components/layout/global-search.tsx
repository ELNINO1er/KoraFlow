"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { Search, Loader2 } from "lucide-react";
import { searchAllAction, type SearchHit, type SearchResults } from "@/features/search/actions";

export function GlobalSearch() {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function onChange(value: string) {
    setQ(value);
    setOpen(true);
    if (timer.current) clearTimeout(timer.current);
    if (value.trim().length < 2) {
      setResults(null);
      return;
    }
    timer.current = setTimeout(() => {
      startTransition(async () => {
        setResults(await searchAllAction(value));
      });
    }, 250);
  }

  const total = results ? results.contacts.length + results.quotes.length + results.invoices.length : 0;

  return (
    <div className="relative hidden max-w-xl flex-1 sm:block">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={q}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder="Rechercher un client, un devis, une facture…"
        className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      {open && q.trim().length >= 2 ? (
        <div className="absolute z-40 mt-1 w-full overflow-hidden rounded-lg border border-border bg-surface p-1 shadow-md">
          {pending && !results ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">
              <Loader2 className="mr-1 inline size-4 animate-spin" /> Recherche…
            </p>
          ) : total === 0 ? (
            <p className="px-2 py-3 text-sm text-muted-foreground">Aucun résultat.</p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Group title="Clients" hits={results!.contacts} />
              <Group title="Devis" hits={results!.quotes} />
              <Group title="Factures" hits={results!.invoices} />
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}

function Group({ title, hits }: { title: string; hits: SearchHit[] }) {
  if (hits.length === 0) return null;
  return (
    <div className="py-1">
      <p className="px-2 py-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {hits.map((h) => (
        <Link
          key={h.id}
          href={h.href}
          className="block rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted"
        >
          {h.label}
          {h.sub ? <span className="ml-2 text-xs text-muted-foreground">{h.sub}</span> : null}
        </Link>
      ))}
    </div>
  );
}
