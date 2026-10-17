import type { Metadata } from "next";
import Link from "next/link";
import { Ban } from "lucide-react";
import { listOrganizations } from "@/server/services/platform-admin";
import { Money } from "@/components/ui/money";
import { DateText } from "@/components/ui/date-text";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrgSuspendToggle } from "@/features/admin/admin-controls";
import { OrgDeleteRestore } from "@/features/admin/org-controls";
import { requirePlatformAdmin } from "@/server/auth/platform";
import { AdminFilters, AdminPagination } from "@/features/admin/list-tools";
import type { AdminSearchParams } from "@/lib/admin/query";

export const metadata: Metadata = { title: "Organisations" };

export default async function AdminOrganizationsPage({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  await requirePlatformAdmin();
  const params = await searchParams;
  const result = await listOrganizations(params);
  const orgs = result.items;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          {result.query.status === "deleted" ? "Corbeille" : "Organisations"} ({result.total})
        </h1>
        <p className="text-sm text-muted-foreground">
          Toutes les entreprises hébergées sur la plateforme.
        </p>
      </div>

      <AdminFilters path="/admin/organizations" {...result.query} statuses={[
        { value: "", label: "Toutes (hors corbeille)" }, { value: "active", label: "Actives" },
        { value: "suspended", label: "Suspendues" }, { value: "deleted", label: "Corbeille" },
      ]} />

      <Card>
        <CardContent className="pt-6">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] text-sm">
              <thead>
                <tr className="border-b border-border text-left text-xs font-medium text-muted-foreground">
                  <th className="pb-2 pr-4">Organisation</th>
                  <th className="pb-2 pr-4">Membres</th>
                  <th className="pb-2 pr-4">Contacts</th>
                  <th className="pb-2 pr-4">Factures</th>
                  <th className="pb-2 pr-4">Encaissements</th>
                  <th className="pb-2 pr-4">Créée le</th>
                  <th className="pb-2 pr-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {orgs.map((org) => (
                  <tr key={org.id} className="align-middle">
                    <td className="py-3 pr-4">
                      <Link
                        href={`/admin/organizations/${org.id}`}
                        className="font-medium text-foreground hover:underline"
                      >
                        {org.name}
                      </Link>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">/{org.slug}</span>
                        {org.deletedAt ? <Badge variant="danger">archivée</Badge> : org.suspendedAt ? (
                          <Badge variant="danger">
                            <Ban className="size-3" /> suspendue
                          </Badge>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-3 pr-4 text-foreground">{org.memberCount}</td>
                    <td className="py-3 pr-4 text-foreground">{org.contactCount}</td>
                    <td className="py-3 pr-4 text-foreground">{org.invoiceCount}</td>
                    <td className="py-3 pr-4 text-foreground">
                      <Money minor={org.revenueMinor} currency={org.currency} />
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      <DateText value={org.createdAt} />
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end">
                        {org.deletedAt ? <OrgDeleteRestore orgId={org.id} name={org.name} deleted /> : <OrgSuspendToggle orgId={org.id} name={org.name} suspended={Boolean(org.suspendedAt)} />}
                      </div>
                    </td>
                  </tr>
                ))}
                {orgs.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-6 text-center text-muted-foreground">
                      Aucune organisation.
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
      <AdminPagination path="/admin/organizations" params={params} {...result} />
    </div>
  );
}
