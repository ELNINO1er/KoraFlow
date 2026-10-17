import Link from "next/link";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { adminPageHref, type AdminSearchParams } from "@/lib/admin/query";

const selectClass = "h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function AdminFilters({ path, q, status, sort, statuses, children, placeholder = "Nom, e-mail ou identifiant…" }: {
  path: string; q: string; status: string; sort: string;
  statuses?: { value: string; label: string }[]; children?: React.ReactNode; placeholder?: string;
}) {
  return (
    <form action={path} method="get" className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-surface p-4">
      <label className="flex min-w-0 flex-1 basis-56 flex-col gap-1.5 text-xs font-medium">
        Rechercher
        <Input name="q" defaultValue={q} placeholder={placeholder} maxLength={200} className="h-11" />
      </label>
      {statuses ? <label className="flex flex-col gap-1.5 text-xs font-medium">
        Statut
        <select name="status" defaultValue={status} className={selectClass}>
          {statuses.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
      </label> : null}
      {children}
      <label className="flex flex-col gap-1.5 text-xs font-medium">
        Tri
        <select name="sort" defaultValue={sort === "asc" ? "oldest" : "newest"} className={selectClass}>
          <option value="newest">Plus récents</option><option value="oldest">Plus anciens</option>
        </select>
      </label>
      <Button type="submit" className="h-11"><Search className="size-4" /> Filtrer</Button>
      <Link href={path} className="inline-flex min-h-11 items-center px-2 text-sm text-muted-foreground hover:underline">Réinitialiser</Link>
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
