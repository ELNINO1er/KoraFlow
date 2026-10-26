import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformAdmin } from "@/server/auth/platform";
import { listAuditLog } from "@/server/services/platform-admin";
import { DateText } from "@/components/ui/date-text";
import { AdminFilters, AdminPagination } from "@/features/admin/list-tools";
import { PLATFORM_AUDIT_LABELS, auditTargetHref } from "@/lib/admin/audit";
import type { AdminSearchParams } from "@/lib/admin/query";

export const metadata: Metadata = { title: "Journal d’audit" };

export default async function AdminAuditPage({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const result = await listAuditLog(params);
  const { query, items } = result;
  return <div className="flex flex-col gap-6">
    <div><h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight text-foreground">Journal d’audit</h1>
      <p className="mt-1 text-sm text-muted-foreground">Retrouvez les interventions, leurs auteurs et le détail des modifications. Les dates sont filtrées en UTC.</p></div>
    <AdminFilters
      path="/admin/audit"
      {...query}
      placeholder="Opération, type ou identifiant de cible…"
      extras={[
        { kind: "text", name: "actor", label: "Acteur (e-mail)", value: query.actor, className: "sm:w-48" },
        { kind: "text", name: "organization", label: "Organisation (nom ou ID)", value: query.organization, className: "sm:w-48" },
        {
          kind: "select",
          name: "action",
          label: "Opération",
          value: query.action,
          options: [{ value: "", label: "Toutes les opérations" }, ...Object.entries(PLATFORM_AUDIT_LABELS).map(([value, label]) => ({ value, label }))],
          className: "sm:w-56",
        },
        { kind: "date", name: "from", label: "Du", value: query.from },
        { kind: "date", name: "to", label: "Au", value: query.to },
      ]}
    />
    <div className="overflow-x-auto rounded-xl border border-border bg-surface p-4">
      <table className="w-full min-w-[760px] text-left text-sm">
        <thead><tr className="border-b border-border text-xs text-muted-foreground">
          {["Date", "Opération", "Acteur", "Organisation", "Détails"].map((title) => <th key={title} scope="col" className="px-2 pb-3">{title}</th>)}
        </tr></thead>
        <tbody className="divide-y divide-border">
          {items.map((entry) => {
            const href = auditTargetHref(entry.targetType, entry.targetId);
            return <tr key={entry.id} className="align-top">
              <td className="whitespace-nowrap px-2 py-3 text-xs text-muted-foreground"><DateText value={entry.createdAt} variant="datetime" /></td>
              <td className="px-2 py-3"><p className="font-medium">{PLATFORM_AUDIT_LABELS[entry.action] ?? entry.action}</p>
                <p className="mt-1 text-xs text-muted-foreground">{entry.targetType ?? "—"}{entry.targetId ? ` · ${entry.targetId}` : ""}</p>
                {href ? <Link href={href} className="text-xs text-accent hover:underline">Voir la fiche</Link> : null}
              </td>
              <td className="px-2 py-3 text-xs">{entry.actor?.email ?? "Système ou compte supprimé"}</td>
              <td className="px-2 py-3 text-xs">{entry.organizationId ? <Link className="hover:underline" href={`/admin/organizations/${entry.organizationId}`}>{entry.organization?.name ?? entry.organizationId}</Link> : "Plateforme"}</td>
              <td className="px-2 py-3">{entry.metadata ? <details>
                <summary className="cursor-pointer text-xs text-accent">Motif et modifications</summary>
                <pre className="mt-2 max-w-sm whitespace-pre-wrap break-all rounded-lg bg-muted p-3 text-xs">{JSON.stringify(entry.metadata, null, 2)}</pre>
              </details> : <span className="text-xs text-muted-foreground">Aucun détail supplémentaire</span>}</td>
            </tr>;
          })}
          {!items.length ? <tr><td colSpan={5} className="py-8 text-center text-muted-foreground">Aucune opération ne correspond à ces filtres.</td></tr> : null}
        </tbody>
      </table>
    </div>
    <AdminPagination path="/admin/audit" params={params} {...result} />
  </div>;
}
