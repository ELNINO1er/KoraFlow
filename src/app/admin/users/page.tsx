import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requirePlatformAdmin } from "@/server/auth/platform";
import { listUsers } from "@/server/services/platform-admin";
import { roleLabel } from "@/lib/constants/roles";
import { DateText } from "@/components/ui/date-text";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserActionsMenu } from "@/features/admin/user-actions-menu";
import { CreateUserForm } from "@/features/admin/create-user-form";
import { AddAdminForm } from "@/features/admin/add-admin-form";
import { AdminFilters, AdminPagination } from "@/features/admin/list-tools";
import type { AdminSearchParams } from "@/lib/admin/query";

export const metadata: Metadata = { title: "Utilisateurs" };

export default async function AdminUsersPage({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  const admin = await requirePlatformAdmin();
  const params = await searchParams;
  const result = await listUsers(params);
  const users = result.items;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">
            Utilisateurs ({result.total})
          </h1>
          <p className="text-sm text-muted-foreground">
            Tous les comptes de la plateforme, toutes organisations confondues.
          </p>
        </div>
        <div className="flex flex-wrap items-start gap-3"><CreateUserForm /><AddAdminForm /></div>
      </div>

      <AdminFilters path="/admin/users" {...result.query} statuses={[
        { value: "", label: "Tous les comptes" }, { value: "active", label: "Actifs" },
        { value: "suspended", label: "Suspendus" }, { value: "admin", label: "Administrateurs plateforme" },
        { value: "unverified", label: "E-mail non vérifié" }, { value: "no-organization", label: "Sans organisation" },
      ]} />

      <Card>
        <CardContent className="flex flex-col divide-y divide-border pt-6">
          {users.map((u) => {
            const isSelf = u.id === admin.id;
            return (
              <div
                key={u.id}
                className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 lg:flex-row lg:items-center lg:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Link href={`/admin/users/${u.id}`} className="truncate text-sm font-medium text-foreground hover:underline">
                      {u.name ?? "—"}
                    </Link>
                    {u.isPlatformAdmin ? (
                      <Badge variant="accent">
                        <ShieldCheck className="size-3" /> admin plateforme
                      </Badge>
                    ) : null}
                    {u.suspendedAt ? <Badge variant="danger">suspendu</Badge> : null}
                    {u.emailVerified ? null : <Badge variant="warning">non vérifié</Badge>}
                  </div>
                  <p className="truncate text-xs text-muted-foreground">{u.email}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {u.memberships.length === 0
                      ? "aucune organisation"
                      : u.memberships
                          .map(
                            (m) =>
                              `${m.organization.name} (${roleLabel(m.role)})`,
                          )
                          .join(" · ")}
                    {" · inscrit le "}
                    <DateText value={u.createdAt} />
                  </p>
                </div>

                <div className="flex items-center gap-2 lg:justify-end">
                  <UserActionsMenu
                    userId={u.id}
                    email={u.email}
                    isSelf={isSelf}
                    isAdmin={u.isPlatformAdmin}
                    suspended={Boolean(u.suspendedAt)}
                    emailVerified={u.emailVerified}
                  />
                </div>
              </div>
            );
          })}
          {users.length === 0 ? (
            <p className="py-6 text-center text-muted-foreground">Aucun utilisateur.</p>
          ) : null}
        </CardContent>
      </Card>
      <AdminPagination path="/admin/users" params={params} {...result} />

      <p className="text-xs text-muted-foreground">
        <Link href="/admin" className="hover:underline">
          ← Retour à la vue d&apos;ensemble
        </Link>
      </p>
    </div>
  );
}
