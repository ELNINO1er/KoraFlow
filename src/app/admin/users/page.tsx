import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { requirePlatformAdmin } from "@/server/auth/platform";
import { listUsers } from "@/server/services/platform-admin";
import { roleLabel } from "@/lib/constants/roles";
import { formatShortDate } from "@/lib/formatting/currency";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  UserSuspendToggle,
  PlatformAdminToggle,
  RevokeSessionsButton,
} from "@/features/admin/admin-controls";

export const metadata: Metadata = { title: "Utilisateurs" };

export default async function AdminUsersPage() {
  const admin = await requirePlatformAdmin();
  const users = await listUsers();

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">
          Utilisateurs ({users.length})
        </h1>
        <p className="text-sm text-muted-foreground">
          Tous les comptes de la plateforme, toutes organisations confondues.
        </p>
      </div>

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
                    <p className="truncate text-sm font-medium text-foreground">
                      {u.name ?? "—"}
                    </p>
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
                    {formatShortDate(u.createdAt)}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                  <PlatformAdminToggle
                    userId={u.id}
                    isAdmin={u.isPlatformAdmin}
                    isSelf={isSelf}
                  />
                  <RevokeSessionsButton userId={u.id} />
                  <UserSuspendToggle
                    userId={u.id}
                    suspended={Boolean(u.suspendedAt)}
                    isSelf={isSelf}
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

      <p className="text-xs text-muted-foreground">
        <Link href="/admin" className="hover:underline">
          ← Retour à la vue d&apos;ensemble
        </Link>
      </p>
    </div>
  );
}
