import type { Metadata } from "next";
import Link from "next/link";
import { Ban } from "lucide-react";
import { listOrganizations } from "@/server/services/platform-admin";
import { formatCurrency, formatShortDate } from "@/lib/formatting/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { OrgSuspendToggle } from "@/features/admin/admin-controls";

export const metadata: Metadata = { title: "Organisations" };

export default async function AdminOrganizationsPage() {
  const orgs = await listOrganizations();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Organisations ({orgs.length})
        </h1>
        <p className="text-sm text-muted-foreground">
          Toutes les entreprises hébergées sur la plateforme.
        </p>
      </div>

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
                  <th className="pb-2 pr-4">Revenu encaissé</th>
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
                        {org.suspendedAt ? (
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
                      {formatCurrency(org.revenueMinor, org.currency)}
                    </td>
                    <td className="py-3 pr-4 text-muted-foreground">
                      {formatShortDate(org.createdAt)}
                    </td>
                    <td className="py-3 pr-4">
                      <div className="flex justify-end">
                        <OrgSuspendToggle orgId={org.id} suspended={Boolean(org.suspendedAt)} />
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
    </div>
  );
}
