"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send } from "lucide-react";
import { addNoteAction } from "@/features/contacts/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

/** Ajout d'une note interne à un contact. */
export function NoteForm({ contactId }: { contactId: string }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const ref = useRef<HTMLTextAreaElement>(null);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const content = value.trim();
    if (content === "") return;
    startTransition(async () => {
      await addNoteAction(contactId, content);
      setValue("");
      router.refresh();
      ref.current?.focus();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2">
      <Textarea
        ref={ref}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder="Ajouter une note interne…"
        rows={2}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending || value.trim() === ""}>
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Send className="size-4" />
          )}
          Ajouter la note
        </Button>
      </div>
    </form>
  );
}
