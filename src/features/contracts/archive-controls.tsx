"use client";

import { useTransition, useState } from "react";
import { useRouter } from "next/navigation";
import { RefreshCw, Loader2 } from "lucide-react";
import { retryContractArchiveAction } from "@/features/contracts/actions";

export function RetryArchiveButton({ contractId }: { contractId: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <span className="inline-flex items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => start(async () => {
          setError(null);
          const res = await retryContractArchiveAction(contractId);
          if (!res.ok) setError(res.error ?? "Échec"); else router.refresh();
        })}
        className="inline-flex items-center gap-1 text-accent hover:underline disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <RefreshCw className="size-3.5" />}
        Réessayer l’archivage
      </button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </span>
  );
}
