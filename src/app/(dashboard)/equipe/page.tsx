import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { listTeam } from "@/server/services/team-service";
import { roleLabel } from "@/lib/constants/roles";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { InviteForm, RoleSelect, RemoveMemberButton, CancelInvitationButton } from "@/features/team/team-controls";

export const metadata: Metadata = { title: "Équipe" };

export default async function TeamPage() {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "members.view")) redirect("/dashboard");

  const { members, invitations } = await listTeam(ctx);
  const canManage = can(ctx.role, "members.manage");

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">Équipe</h1>
        <p className="text-sm text-muted-foreground">
          Membres de {ctx.organization.name} et invitations en attente
        </p>
      </div>

      {canManage ? (
        <Card>
          <CardHeader><CardTitle>Inviter un membre</CardTitle></CardHeader>
          <CardContent>
            <InviteForm />
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader><CardTitle>Membres ({members.length})</CardTitle></CardHeader>
        <CardContent>
          <ul className="flex flex-col divide-y divide-border">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                <Avatar className="size-9">
                  {m.user.image ? <AvatarImage src={m.user.image} alt={m.user.name ?? m.user.email} /> : null}
                  <AvatarFallback>{(m.user.name ?? m.user.email).charAt(0).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">{m.user.name ?? "—"}</p>
                  <p className="truncate text-xs text-muted-foreground">{m.user.email}</p>
                </div>
                {canManage ? (
                  <div className="flex items-center gap-2">
                    <RoleSelect membershipId={m.id} current={m.role} />
                    <RemoveMemberButton membershipId={m.id} />
                  </div>
                ) : (
                  <Badge variant="outline">{roleLabel(m.role)}</Badge>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      {invitations.length > 0 ? (
        <Card>
          <CardHeader><CardTitle>Invitations en attente ({invitations.length})</CardTitle></CardHeader>
          <CardContent>
            <ul className="flex flex-col divide-y divide-border">
              {invitations.map((inv) => (
                <li key={inv.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium text-foreground">{inv.email}</p>
                    <p className="text-xs text-muted-foreground">{roleLabel(inv.role)} · en attente</p>
                  </div>
                  {canManage ? <CancelInvitationButton id={inv.id} /> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
