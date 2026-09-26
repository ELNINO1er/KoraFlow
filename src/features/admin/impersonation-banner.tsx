"use client";

import { useTransition } from "react";
import { Loader2, UserCog } from "lucide-react";
import { stopImpersonatingAction } from "@/features/admin/actions";

/**
 * Bandeau affiché lorsqu'un admin plateforme consulte l'application « en tant
 * que » un autre utilisateur (impersonation). Permet de revenir à son compte.
 */
export function ImpersonationBanner() {
  const [pending, startTransition] = useTransition();
  return (
    <div className="flex items-center justify-center gap-3 bg-amber-500 px-4 py-2 text-center text-sm font-medium text-amber-950">
      <UserCog className="size-4 shrink-0" />
      <span>Vous consultez cet espace en tant qu&apos;un autre utilisateur (impersonation).</span>
      <button
        type="button"
        disabled={pending}
        onClick={() => startTransition(() => stopImpersonatingAction())}
        className="inline-flex items-center gap-1.5 rounded-md bg-amber-950/10 px-2.5 py-1 font-semibold hover:bg-amber-950/20 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : null}
        Revenir à mon compte
      </button>
    </div>
  );
}
