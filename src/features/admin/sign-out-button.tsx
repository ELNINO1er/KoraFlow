"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import { authClient } from "@/server/auth/auth-client";

export function AdminSignOutButton() {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState(false);
  const router = useRouter();
  return <div className="flex flex-col items-end gap-1">
    <button type="button" aria-label="Se déconnecter" title="Se déconnecter" disabled={pending}
      className="inline-flex size-11 items-center justify-center rounded-lg border border-white/20 text-white/90 hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white disabled:opacity-50"
      onClick={() => startTransition(async () => {
        setError(false);
        const result = await authClient.signOut();
        if (result.error) { setError(true); return; }
        router.replace("/login"); router.refresh();
      })}>
      <LogOut className="size-4" />
    </button>
    {error ? <span role="alert" className="text-xs">Déconnexion impossible. Réessayez.</span> : null}
  </div>;
}
