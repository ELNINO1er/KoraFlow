import Link from "next/link";
import { notFound } from "next/navigation";
import { requirePlatformAdmin } from "@/server/auth/platform";
import { getPlatformUserDetail } from "@/server/services/platform-admin";
import { UserActionsMenu } from "@/features/admin/user-actions-menu";
import { DateText } from "@/components/ui/date-text";
import { Badge } from "@/components/ui/badge";
import { roleLabel } from "@/lib/constants/roles";

export default async function UserDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const admin = await requirePlatformAdmin();
  const { id } = await params;
  const user = await getPlatformUserDetail(id);
  if (!user) notFound();
  return <div className="flex flex-col gap-6">
    <Link href="/admin/users" className="text-sm text-muted-foreground hover:underline">← Tous les utilisateurs</Link>
    <div className="flex items-start justify-between gap-3">
      <div><h1 className="font-display text-[1.75rem] font-extrabold leading-tight tracking-tight text-foreground">{user.name ?? user.email}</h1>
        <p className="break-all text-sm text-muted-foreground">{user.email}</p>
        <p className="mt-1 text-xs text-muted-foreground">Inscrit le <DateText value={user.createdAt} /> · {user.id}</p>
        <div className="mt-3 flex flex-wrap gap-2"><Badge variant={user.suspendedAt ? "danger" : "success"}>{user.suspendedAt ? "Suspendu" : "Actif"}</Badge>
          {user.isPlatformAdmin ? <Badge variant="accent">Administrateur plateforme</Badge> : null}
          {!user.emailVerified ? <Badge variant="warning">E-mail non vérifié</Badge> : null}</div>
      </div>
      <UserActionsMenu userId={user.id} email={user.email} isSelf={admin.id === user.id} isAdmin={user.isPlatformAdmin} suspended={Boolean(user.suspendedAt)} emailVerified={user.emailVerified} />
    </div>
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-semibold">Organisations et rôles</h2>
      <ul className="mt-3 divide-y divide-border">{user.memberships.map((membership) => <li key={membership.id} className="flex flex-wrap justify-between gap-2 py-3">
        <Link href={`/admin/organizations/${membership.organization.id}`} className="font-medium hover:underline">{membership.organization.name}</Link>
        <span className="text-sm text-muted-foreground">{roleLabel(membership.role)}{membership.organization.deletedAt ? " · archivée" : membership.organization.suspendedAt ? " · suspendue" : ""}</span>
      </li>)}</ul>
      {!user.memberships.length ? <p className="mt-3 text-sm text-muted-foreground">Aucune organisation.</p> : null}
    </section>
    <section className="rounded-xl border border-border bg-surface p-5">
      <h2 className="font-display text-lg font-semibold">Sessions actives</h2>
      <p className="mt-1 text-xs text-muted-foreground">20 sessions les plus récentes au maximum.</p>
      <ul className="mt-3 divide-y divide-border">{user.sessions.map((session) => <li key={session.id} className="py-3 text-sm">
        <p>{session.ipAddress ?? "Adresse IP inconnue"}{session.impersonatedBy ? " · session de support" : ""}</p>
        <p className="break-all text-xs text-muted-foreground">{session.userAgent ?? "Appareil inconnu"}</p>
        <p className="mt-1 text-xs text-muted-foreground">Ouverte le <DateText value={session.createdAt} variant="datetime" /> · Expire le <DateText value={session.expiresAt} variant="datetime" /></p>
      </li>)}</ul>
      {!user.sessions.length ? <p className="mt-3 text-sm text-muted-foreground">Aucune session active.</p> : null}
    </section>
    <Link href={`/admin/audit?q=${encodeURIComponent(user.id)}`} className="text-sm text-accent hover:underline">Voir les interventions concernant ce compte →</Link>
  </div>;
}
