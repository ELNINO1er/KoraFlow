"use client";

import { useTransition } from "react";
import { Trash2, Loader2 } from "lucide-react";
import { deleteServiceAction } from "@/features/services/actions";
import { Button } from "@/components/ui/button";

export function DeleteServiceButton({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();

  function onDelete() {
    if (!window.confirm("Supprimer ce service ? Cette action est réversible côté base (suppression logique).")) {
      return;
    }
    startTransition(async () => {
      await deleteServiceAction(id);
    });
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="text-danger hover:bg-danger/10"
      onClick={onDelete}
      disabled={pending}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      Supprimer
    </Button>
  );
}
