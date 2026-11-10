"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRightLeft, Loader2, LogOut } from "lucide-react";
import { authClient } from "@/server/auth/auth-client";
import { setActiveOrganization } from "@/features/organizations/actions";

/** Actions possibles une fois l'essai échu : changer d'organisation ou se déconnecter. */
export function TrialExpiredActions({ organizations }: { organizations: { id: string; name: string }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="mt-6 flex flex-col gap-3">
      {organizations.length > 0 ? (
        <div className="flex flex-col gap-2 text-left">
          <p className="text-xs font-medium text-muted-foreground">Vos autres organisations</p>
          {organizations.map((org) => (
            <button
              key={org.id}
              type="button"
              disabled={pending}
              onClick={() =>
                startTransition(async () => {
                  await setActiveOrganization(org.id);
                  router.replace("/dashboard");
                  router.refresh();
                })
              }
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
            >
              <ArrowRightLeft className="size-4 shrink-0" />
              <span className="truncate">Ouvrir {org.name}</span>
            </button>
          ))}
        </div>
      ) : null}
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            const result = await authClient.signOut();
            if (result.error) {
              setError("Déconnexion impossible. Réessayez.");
              return;
            }
            router.replace("/login");
            router.refresh();
          })
        }
        className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-border px-4 text-sm font-medium text-foreground hover:bg-muted disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
        Se déconnecter
      </button>
      {error ? <p role="alert" className="text-xs text-danger">{error}</p> : null}
    </div>
  );
}
