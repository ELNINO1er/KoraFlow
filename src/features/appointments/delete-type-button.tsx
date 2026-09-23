"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteTypeAction } from "@/features/appointments/actions";
import { Button } from "@/components/ui/button";

export function DeleteTypeButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      className="text-danger hover:bg-danger/10"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Supprimer ce type de rendez-vous ?")) return;
        startTransition(async () => {
          await deleteTypeAction(id);
        });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      Supprimer
    </Button>
  );
}
