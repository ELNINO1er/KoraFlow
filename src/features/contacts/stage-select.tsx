"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ContactStage } from "@prisma/client";
import { CONTACT_STAGES } from "@/lib/constants/crm";
import { changeContactStageAction } from "@/features/contacts/actions";

/** Sélecteur d'étape de pipeline : applique le changement côté serveur. */
export function StageSelect({
  contactId,
  current,
  disabled,
}: {
  contactId: string;
  current: ContactStage;
  disabled?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value as ContactStage;
    if (next === current) return;
    startTransition(async () => {
      await changeContactStageAction(contactId, next);
      router.refresh();
    });
  }

  return (
    <select
      value={current}
      onChange={onChange}
      disabled={disabled || pending}
      className="h-9 rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
    >
      {CONTACT_STAGES.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
