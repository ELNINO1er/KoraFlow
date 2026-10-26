"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import type { ContactStage } from "@prisma/client";
import { CONTACT_STAGES } from "@/lib/constants/crm";
import { FormSelect } from "@/components/ui/form-select";
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

  function onChange(value: string) {
    const next = value as ContactStage;
    if (next === current) return;
    startTransition(async () => {
      await changeContactStageAction(contactId, next);
      router.refresh();
    });
  }

  return (
    <FormSelect
      value={current}
      onValueChange={onChange}
      disabled={disabled || pending}
      options={CONTACT_STAGES}
      aria-label="Étape du pipeline"
      className="h-9 w-auto min-w-44"
    />
  );
}
