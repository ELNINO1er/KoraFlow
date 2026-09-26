"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  MoreHorizontal,
  UserCog,
  KeyRound,
  MailCheck,
  LogOut,
  ShieldCheck,
  ShieldOff,
  Ban,
  RotateCcw,
  Trash2,
  Loader2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import {
  impersonateAction,
  sendResetEmailAction,
  forceVerifyEmailAction,
  revokeSessionsAction,
  setPlatformAdminAction,
  suspendUserAction,
  deleteUserAction,
} from "@/features/admin/actions";

export function UserActionsMenu({
  userId,
  isSelf,
  isAdmin,
  suspended,
  emailVerified,
}: {
  userId: string;
  isSelf: boolean;
  isAdmin: boolean;
  suspended: boolean;
  emailVerified: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);

  function run(
    fn: () => Promise<{ ok: boolean; error?: string } | void>,
    confirmMessage?: string,
    successMessage?: string,
  ) {
    if (confirmMessage && !window.confirm(confirmMessage)) return;
    startTransition(async () => {
      setMsg(null);
      const r = await fn();
      // Les actions qui redirigent (impersonation) ne renvoient rien.
      if (r && !r.ok) {
        setMsg(r.error ?? "Action impossible.");
        return;
      }
      if (successMessage) setMsg(successMessage);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <DropdownMenu>
        <DropdownMenuTrigger
          disabled={pending}
          className="inline-flex size-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50"
          aria-label="Actions"
        >
          {pending ? <Loader2 className="size-4 animate-spin" /> : <MoreHorizontal className="size-4" />}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Actions</DropdownMenuLabel>

          {!isSelf && !suspended ? (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                run(
                  () => impersonateAction(userId),
                  "Ouvrir la session de cet utilisateur ? Vous verrez l'application en tant que lui (tracé dans l'audit).",
                );
              }}
            >
              <UserCog className="size-4" />
              Se connecter en tant que
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              run(
                () => sendResetEmailAction(userId),
                undefined,
                "E-mail de réinitialisation envoyé.",
              );
            }}
          >
            <KeyRound className="size-4" />
            Envoyer un lien de réinitialisation
          </DropdownMenuItem>

          {!emailVerified ? (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                run(() => forceVerifyEmailAction(userId), undefined, "E-mail marqué comme vérifié.");
              }}
            >
              <MailCheck className="size-4" />
              Forcer la vérification e-mail
            </DropdownMenuItem>
          ) : null}

          <DropdownMenuItem
            onSelect={(e) => {
              e.preventDefault();
              run(() => revokeSessionsAction(userId), "Déconnecter cet utilisateur de toutes ses sessions ?");
            }}
          >
            <LogOut className="size-4" />
            Déconnecter (révoquer sessions)
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {!(isSelf && isAdmin) ? (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                run(
                  () => setPlatformAdminAction(userId, !isAdmin),
                  isAdmin
                    ? "Retirer l'accès administrateur de plateforme ?"
                    : "Accorder l'accès administrateur de PLATEFORME (toutes les organisations) ?",
                );
              }}
              className={isAdmin ? "text-danger focus:bg-danger/10" : "text-accent focus:bg-accent/10"}
            >
              {isAdmin ? <ShieldOff className="size-4" /> : <ShieldCheck className="size-4" />}
              {isAdmin ? "Révoquer admin plateforme" : "Promouvoir admin plateforme"}
            </DropdownMenuItem>
          ) : null}

          {!isSelf ? (
            <DropdownMenuItem
              onSelect={(e) => {
                e.preventDefault();
                run(
                  () => suspendUserAction(userId, !suspended),
                  suspended
                    ? "Réactiver ce compte ?"
                    : "Suspendre ce compte ? L'utilisateur sera déconnecté et bloqué.",
                );
              }}
              className={suspended ? "" : "text-danger focus:bg-danger/10"}
            >
              {suspended ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}
              {suspended ? "Réactiver le compte" : "Suspendre le compte"}
            </DropdownMenuItem>
          ) : null}

          {!isSelf ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  run(
                    () => deleteUserAction(userId),
                    "SUPPRIMER définitivement ce compte et ses sessions ? Action irréversible.",
                  );
                }}
                className="text-danger focus:bg-danger/10"
              >
                <Trash2 className="size-4" />
                Supprimer le compte
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuContent>
      </DropdownMenu>
      {msg ? <span className="max-w-[220px] text-right text-xs text-muted-foreground">{msg}</span> : null}
    </div>
  );
}
