"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Send, Trash2, X } from "lucide-react";
import type { MembershipRole } from "@prisma/client";
import { ASSIGNABLE_ROLES } from "@/lib/constants/roles";
import {
  inviteMemberAction,
  cancelInvitationAction,
  changeRoleAction,
  removeMemberAction,
} from "@/features/team/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormSelect } from "@/components/ui/form-select";

export function InviteForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<MembershipRole>("COLLABORATOR");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    startTransition(async () => {
      const result = await inviteMemberAction(email.trim(), role);
      if (!result.ok) {
        setError(result.error ?? "Invitation impossible.");
        return;
      }
      setEmail("");
      setOk(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="email@exemple.com" required className="flex-1" />
      <FormSelect
        value={role}
        onValueChange={(v) => setRole(v as MembershipRole)}
        options={ASSIGNABLE_ROLES}
        className="w-full sm:w-44"
      />
      <Button type="submit" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Inviter
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      {ok ? <span className="text-xs text-success">Invitation envoyée.</span> : null}
    </form>
  );
}

export function RoleSelect({ membershipId, current }: { membershipId: string; current: MembershipRole }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end">
      <FormSelect
        value={current}
        disabled={pending}
        options={ASSIGNABLE_ROLES}
        className="w-44"
        onValueChange={(next) => {
          if (next === current) return;
          startTransition(async () => {
            setError(null);
            const r = await changeRoleAction(membershipId, next as MembershipRole);
            if (!r.ok) setError(r.error ?? "Erreur");
            router.refresh();
          });
        }}
      />
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}

export function RemoveMemberButton({ membershipId }: { membershipId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  return (
    <div className="flex flex-col items-end">
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="text-danger hover:bg-danger/10"
        disabled={pending}
        aria-label="Retirer le membre"
        onClick={() => {
          if (!window.confirm("Retirer ce membre ?")) return;
          startTransition(async () => {
            setError(null);
            const r = await removeMemberAction(membershipId);
            if (!r.ok) setError(r.error ?? "Erreur");
            router.refresh();
          });
        }}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Trash2 className="size-4" />}
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}

export function CancelInvitationButton({ id }: { id: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      size="icon"
      variant="ghost"
      className="text-muted-foreground hover:bg-muted"
      disabled={pending}
      aria-label="Annuler l'invitation"
      onClick={() =>
        startTransition(async () => {
          await cancelInvitationAction(id);
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
    </Button>
  );
}
