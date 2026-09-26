"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createUserAction } from "@/features/admin/actions";

export function CreateUserForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    startTransition(async () => {
      const r = await createUserAction(email, name, password);
      if (!r.ok) {
        setError(r.error ?? "Création impossible.");
        return;
      }
      setEmail("");
      setName("");
      setPassword("");
      setOk(true);
      router.refresh();
    });
  }

  if (!open) {
    return (
      <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
        <UserPlus className="size-4" />
        Créer un compte
      </Button>
    );
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input placeholder="Nom" value={name} onChange={(e) => setName(e.target.value)} className="sm:w-40" />
      <Input type="email" placeholder="email@exemple.com" required value={email} onChange={(e) => setEmail(e.target.value)} className="sm:w-56" />
      <Input type="password" placeholder="Mot de passe (8+)" required value={password} onChange={(e) => setPassword(e.target.value)} className="sm:w-48" />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
        Créer
      </Button>
      <Button type="button" size="sm" variant="ghost" onClick={() => setOpen(false)}>
        Annuler
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      {ok ? <span className="text-xs text-success">Compte créé.</span> : null}
    </form>
  );
}
