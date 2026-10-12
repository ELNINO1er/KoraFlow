import type { Metadata } from "next";
import Link from "next/link";
import { FolderKanban } from "lucide-react";
import type { ProjectStatus } from "@prisma/client";
import { requireAuthContext } from "@/server/auth/context";
import { listProjects } from "@/server/services/project-service";
import { PROJECT_STATUSES, projectStatusLabel, projectStatusVariant } from "@/lib/constants/projects";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { ListSearch } from "@/components/app/list-search";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Projets" };

const VALID = new Set(PROJECT_STATUSES.map((s) => s.value));

function contactName(c: { firstName: string; lastName: string | null; companyName: string | null }) {
  return c.companyName ?? `${c.firstName} ${c.lastName ?? ""}`.trim();
}

function query(params: Record<string, string | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

export default async function ProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const ctx = await requireAuthContext();
  const sp = await searchParams;
  const status = sp.status && VALID.has(sp.status as ProjectStatus) ? (sp.status as ProjectStatus) : undefined;
  const q = sp.q?.trim() || undefined;

  const { items, total } = await listProjects(ctx, { status, search: q });

  return (
    <div className="mx-auto flex max-w-7xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Projets</h1>
        <p className="text-sm text-muted-foreground">
          {total} projet{total > 1 ? "s" : ""} · créés automatiquement au paiement des factures
        </p>
      </div>

      <div className="flex flex-col gap-3">
        <ListSearch placeholder="Rechercher un projet…" />
        <div className="flex flex-wrap gap-2">
          <Link href={`/projets${query({ q })}`} className={cn("rounded-md border px-3 py-1 text-xs font-medium", !status ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted")}>
            Tous
          </Link>
          {PROJECT_STATUSES.map((s) => (
            <Link key={s.value} href={`/projets${query({ q, status: s.value })}`} className={cn("rounded-md border px-3 py-1 text-xs font-medium", status === s.value ? "border-primary bg-primary text-primary-foreground" : "border-border text-muted-foreground hover:bg-muted")}>
              {s.label}
            </Link>
          ))}
        </div>
      </div>

      {items.length === 0 ? (
        <Card className="flex flex-col items-center justify-center gap-3 p-12 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-muted">
            <FolderKanban className="size-6 text-muted-foreground" />
          </span>
          <p className="font-medium text-foreground">Aucun projet</p>
          <p className="max-w-sm text-sm text-muted-foreground">
            Un projet est créé automatiquement dès qu’une facture est intégralement payée.
          </p>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((p) => (
            <Link key={p.id} href={`/projets/${p.id}`}>
              <Card className="h-full p-5 transition-colors hover:border-accent">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-foreground">{p.title}</p>
                  <Badge variant={projectStatusVariant(p.status)}>{projectStatusLabel(p.status)}</Badge>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{contactName(p.contact)}</p>
                <div className="mt-4">
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Progression</span>
                    <span className="font-medium text-foreground">{p.progress}%</span>
                  </div>
                  <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-accent" style={{ width: `${p.progress}%` }} />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
