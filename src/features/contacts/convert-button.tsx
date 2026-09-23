"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { UserCheck, Loader2 } from "lucide-react";
import { convertContactAction } from "@/features/contacts/actions";
import { Button } from "@/components/ui/button";

export function ConvertToClientButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="sm"
      variant="outline"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          await convertContactAction(id);
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <UserCheck className="size-4" />}
      Convertir en client
    </Button>
  );
}
