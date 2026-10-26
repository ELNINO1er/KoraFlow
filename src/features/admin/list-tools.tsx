"use client";

import { useRef, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Loader2, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/ui/form-select";
import { cn } from "@/lib/utils";
import { adminPageHref, type AdminSearchParams } from "@/lib/admin/query";

/** Filtre supplémentaire propre à une page (journal d'audit : acteur, opération, dates…). */
export type AdminExtraFilter =
  | { kind: "text"; name: string; label: string; value: string; className?: string }
  | { kind: "date"; name: string; label: string; value: string }
  | { kind: "select"; name: string; label: string; value: string; options: { value: string; label: string }[]; className?: string };

const TEXT_DELAY_MS = 350;

/**
 * Filtres des listes de la console, appliqués automatiquement : la recherche
 * texte après une courte pause de frappe, les listes et dates immédiatement.
 * Les paramètres vides sont retirés de l'URL et la pagination repart de 1.
 */
export function AdminFilters({
  path,
  q,
  status,
  sort,
  statuses,
  extras,
  placeholder = "Nom, e-mail ou identifiant…",
}: {
  path: string;
  q: string;
  status: string;
  sort: string;
  statuses?: { value: string; label: string }[];
  extras?: AdminExtraFilter[];
  placeholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const formRef = useRef<HTMLFormElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [pending, startTransition] = useTransition();

  function apply() {
    if (timer.current) clearTimeout(timer.current);
    const form = formRef.current;
    if (!form) return;
    const sp = new URLSearchParams();
    for (const [key, value] of new FormData(form)) {
      const v = String(value).trim();
      if (v && !(key === "sort" && v === "newest")) sp.set(key, v);
    }
    const qs = sp.toString();
    startTransition(() => router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false }));
  }

  function applySoon() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(apply, TEXT_DELAY_MS);
  }

  // Les listes stylées mettent à jour un champ masqué : on attend le rendu avant de relire le formulaire.
  const applyAfterRender = () => requestAnimationFrame(apply);

  return (
    <form
      ref={formRef}
      action={path}
      method="get"
      onSubmit={(e) => { e.preventDefault(); apply(); }}
      className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4"
    >
      <label className="flex min-w-0 flex-1 basis-56 flex-col gap-1.5 text-xs font-medium">
        Rechercher
        <span className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
          <Input name="q" type="search" defaultValue={q} placeholder={placeholder} maxLength={200} onChange={applySoon} className="h-11 pl-9" />
        </span>
      </label>
      {statuses ? (
        <label className="flex flex-col gap-1.5 text-xs font-medium">
          Statut
          <FormSelect name="status" defaultValue={status} options={statuses} onValueChange={applyAfterRender} className="h-11 min-w-48" />
        </label>
      ) : null}
      {extras?.map((f) => (
        <label key={f.name} className="flex max-w-full flex-col gap-1.5 text-xs font-medium">
          {f.label}
          {f.kind === "select" ? (
            <FormSelect name={f.name} defaultValue={f.value} options={f.options} onValueChange={applyAfterRender} className={cn("h-11 max-w-full", f.className)} />
          ) : f.kind === "date" ? (
            <Input type="date" name={f.name} defaultValue={f.value} onChange={apply} className="h-11 w-40" />
          ) : (
            <Input name={f.name} defaultValue={f.value} maxLength={200} onChange={applySoon} className={cn("h-11", f.className)} />
          )}
        </label>
      ))}
      <label className="flex flex-col gap-1.5 text-xs font-medium">
        Tri
        <FormSelect
          name="sort"
          defaultValue={sort === "asc" ? "oldest" : "newest"}
          options={[{ value: "newest", label: "Plus récents" }, { value: "oldest", label: "Plus anciens" }]}
          onValueChange={applyAfterRender}
          className="h-11 min-w-36"
        />
      </label>
      <div className="flex min-h-11 items-center gap-2">
        {pending ? <Loader2 className="size-4 animate-spin text-muted-foreground" aria-label="Filtrage…" /> : null}
        <Link href={path} className="inline-flex min-h-11 items-center px-2 text-sm text-muted-foreground hover:underline">Réinitialiser</Link>
      </div>
    </form>
  );
}

export function AdminPagination({ path, params, page, pages, total }: {
  path: string; params: AdminSearchParams; page: number; pages: number; total: number;
}) {
  return <nav aria-label="Pagination" className="flex flex-wrap items-center justify-between gap-3 text-sm">
    <p className="text-muted-foreground">{total} résultat{total > 1 ? "s" : ""} · Page {page} sur {pages}</p>
    <div className="flex gap-3">
      {page > 1 ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 hover:bg-muted" href={adminPageHref(path, params, page - 1)}>Précédente</Link> : null}
      {page < pages ? <Link className="inline-flex min-h-11 items-center rounded-lg border border-border px-4 hover:bg-muted" href={adminPageHref(path, params, page + 1)}>Suivante</Link> : null}
    </div>
  </nav>;
}
