"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Ban, RotateCcw, ShieldCheck, ShieldOff, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  suspendOrgAction,
  suspendUserAction,
  setPlatformAdminAction,
  revokeSessionsAction,
} from "@/features/admin/actions";

function useAction() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const runAction = (
    fn: () => Promise<{ ok: boolean; error?: string }>,
    confirmMessage?: string,
  ) => {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    startTransition(async () => {
      setError(null);
      const r = await fn();
      if (!r.ok) {
        setError(r.error ?? "Action impossible.");
        return;
      }
      router.refresh();
    });
  };
  return { pending, error, runAction };
}

export function OrgSuspendToggle({
  orgId,
  suspended,
}: {
  orgId: string;
  suspended: boolean;
}) {
  const { pending, error, runAction } = useAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={suspended ? "outline" : "ghost"}
        className={suspended ? "" : "text-danger hover:bg-danger/10"}
        disabled={pending}
        onClick={() =>
          runAction(
            () => suspendOrgAction(orgId, !suspended),
            suspended
              ? "Réactiver cette organisation ?"
              : "Suspendre cette organisation ? Ses membres perdront l'accès.",
          )
        }
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : suspended ? (
          <RotateCcw className="size-4" />
        ) : (
          <Ban className="size-4" />
        )}
        {suspended ? "Réactiver" : "Suspendre"}
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}

export function UserSuspendToggle({
  userId,
  suspended,
  isSelf,
}: {
  userId: string;
  suspended: boolean;
  isSelf: boolean;
}) {
  const { pending, error, runAction } = useAction();
  if (isSelf) {
    return <span className="text-xs text-muted-foreground">vous</span>;
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant={suspended ? "outline" : "ghost"}
        className={suspended ? "" : "text-danger hover:bg-danger/10"}
        disabled={pending}
        onClick={() =>
          runAction(
            () => suspendUserAction(userId, !suspended),
            suspended
              ? "Réactiver ce compte ?"
              : "Suspendre ce compte ? L'utilisateur sera déconnecté et bloqué.",
          )
        }
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : suspended ? (
          <RotateCcw className="size-4" />
        ) : (
          <Ban className="size-4" />
        )}
        {suspended ? "Réactiver" : "Suspendre"}
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}

export function PlatformAdminToggle({
  userId,
  isAdmin,
  isSelf,
}: {
  userId: string;
  isAdmin: boolean;
  isSelf: boolean;
}) {
  const { pending, error, runAction } = useAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className={isAdmin ? "text-danger hover:bg-danger/10" : "text-accent hover:bg-accent/10"}
        disabled={pending}
        onClick={() =>
          runAction(
            () => setPlatformAdminAction(userId, !isAdmin),
            isAdmin
              ? "Retirer l'accès administrateur de plateforme à cet utilisateur ?"
              : "Accorder l'accès administrateur de PLATEFORME (accès à toutes les organisations) à cet utilisateur ?",
          )
        }
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : isAdmin ? (
          <ShieldOff className="size-4" />
        ) : (
          <ShieldCheck className="size-4" />
        )}
        {isAdmin ? "Révoquer admin" : "Promouvoir admin"}
      </Button>
      {isSelf ? (
        <span className="text-[11px] text-muted-foreground">
          Vous ne pouvez pas retirer votre propre accès
        </span>
      ) : null}
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}

export function RevokeSessionsButton({ userId }: { userId: string }) {
  const { pending, error, runAction } = useAction();
  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="text-muted-foreground hover:bg-muted"
        disabled={pending}
        onClick={() =>
          runAction(
            () => revokeSessionsAction(userId),
            "Déconnecter cet utilisateur de toutes ses sessions ?",
          )
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
        Déconnecter
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
