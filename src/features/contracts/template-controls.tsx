"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Copy, Archive, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { duplicateTemplateAction, archiveTemplateAction } from "@/features/contracts/template-actions";

export function DuplicateTemplateButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => start(async () => { await duplicateTemplateAction(id); router.refresh(); })}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Copy className="size-4" />}
      Dupliquer
    </Button>
  );
}

export function ArchiveTemplateButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!confirm("Archiver ce modèle ? Il ne sera plus proposé à la génération.")) return;
        start(async () => { await archiveTemplateAction(id); router.refresh(); });
      }}
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <Archive className="size-4" />}
      Archiver
    </Button>
  );
}
