import type { Metadata } from "next";
import Link from "next/link";
import { requirePlatformAdmin } from "@/server/auth/platform";
import { listUsers } from "@/server/services/platform-admin";
import { AddAdminForm } from "@/features/admin/add-admin-form";
import { UserActionsMenu } from "@/features/admin/user-actions-menu";
import { AdminFilters, AdminPagination } from "@/features/admin/list-tools";
import { Badge } from "@/components/ui/badge";
import type { AdminSearchParams } from "@/lib/admin/query";

export const metadata: Metadata = { title: "Administrateurs plateforme" };

export default async function AdminsPage({ searchParams }: { searchParams: Promise<AdminSearchParams> }) {
  const admin = await requirePlatformAdmin();
  const params = await searchParams;
  const result = await listUsers({ ...params, status: "admin" });
  return <div className="flex flex-col gap-6">
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div><h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight text-foreground">Administrateurs plateforme ({result.total})</h1>
        <p className="mt-1 text-sm text-muted-foreground">Ces comptes ont accès à toutes les organisations. Chaque attribution et retrait d’accès est journalisé.</p></div>
      <AddAdminForm />
    </div>
    <AdminFilters path="/admin/admins" {...result.query} />
    <div className="divide-y divide-border rounded-xl border border-border bg-surface px-5">
      {result.items.map((user) => <div key={user.id} className="flex items-center justify-between gap-3 py-4">
        <div className="min-w-0"><Link href={`/admin/users/${user.id}`} className="font-medium hover:underline">{user.name ?? user.email}</Link>
          <p className="break-all text-sm text-muted-foreground">{user.email}</p>
          <div className="mt-2 flex flex-wrap gap-2"><Badge variant={user.suspendedAt ? "danger" : "success"}>{user.suspendedAt ? "Suspendu" : "Actif"}</Badge>
            {!user.emailVerified ? <Badge variant="warning">E-mail à vérifier</Badge> : null}
            {user.id === admin.id ? <Badge variant="accent">Vous</Badge> : null}</div>
        </div>
        <UserActionsMenu userId={user.id} email={user.email} isSelf={user.id === admin.id} isAdmin suspended={Boolean(user.suspendedAt)} emailVerified={user.emailVerified} />
      </div>)}
      {!result.items.length ? <p className="py-8 text-center text-muted-foreground">Aucun administrateur ne correspond à cette recherche.</p> : null}
    </div>
    <AdminPagination path="/admin/admins" params={params} {...result} />
  </div>;
}
