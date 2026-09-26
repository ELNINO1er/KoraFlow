"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trash2, RotateCcw, UserPlus, X } from "lucide-react";
import type { MembershipRole } from "@prisma/client";
import { ASSIGNABLE_ROLES } from "@/lib/constants/roles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { OrgEditableFields } from "@/server/services/platform-admin";
import {
  updateOrgAction,
  deleteOrgAction,
  restoreOrgAction,
  addMemberAction,
  changeMemberRoleAction,
  removeMemberAction,
} from "@/features/admin/actions";

const selectClass =
  "h-10 rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60";

export function OrgEditForm({
  orgId,
  initial,
}: {
  orgId: string;
  initial: OrgEditableFields;
}) {
  const router = useRouter();
  const [form, setForm] = useState<OrgEditableFields>(initial);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  function set<K extends keyof OrgEditableFields>(key: K, value: OrgEditableFields[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);
    startTransition(async () => {
      const r = await updateOrgAction(orgId, form);
      if (!r.ok) {
        setError(r.error ?? "Enregistrement impossible.");
        return;
      }
      setOk(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
      <Field label="Nom" value={form.name} onChange={(v) => set("name", v)} required />
      <Field label="Raison sociale" value={form.legalName ?? ""} onChange={(v) => set("legalName", v)} />
      <Field label="E-mail" type="email" value={form.email ?? ""} onChange={(v) => set("email", v)} />
      <Field label="Téléphone" value={form.phone ?? ""} onChange={(v) => set("phone", v)} />
      <Field label="Ville" value={form.city ?? ""} onChange={(v) => set("city", v)} />
      <Field label="Pays (ISO2)" value={form.country} onChange={(v) => set("country", v)} />
      <Field label="Devise (ISO)" value={form.currency} onChange={(v) => set("currency", v)} />
      <Field label="Fuseau horaire" value={form.timezone} onChange={(v) => set("timezone", v)} />
      <Field label="Langue" value={form.locale} onChange={(v) => set("locale", v)} />

      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Enregistrer
        </Button>
        {error ? <span className="text-sm text-danger">{error}</span> : null}
        {ok ? <span className="text-sm text-success">Modifications enregistrées.</span> : null}
      </div>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label>{label}</Label>
      <Input type={type} value={value} required={required} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

export function OrgDeleteRestore({ orgId, deleted }: { orgId: string; deleted: boolean }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function act() {
    const confirmMsg = deleted
      ? "Restaurer cette organisation ?"
      : "Supprimer (archiver) cette organisation ? Ses membres perdront l'accès. Réversible via Restaurer.";
    if (!window.confirm(confirmMsg)) return;
    startTransition(async () => {
      setError(null);
      const r = deleted ? await restoreOrgAction(orgId) : await deleteOrgAction(orgId);
      if (!r.ok) {
        setError(r.error ?? "Action impossible.");
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant={deleted ? "outline" : "ghost"}
        size="sm"
        className={deleted ? "" : "text-danger hover:bg-danger/10"}
        disabled={pending}
        onClick={act}
      >
        {pending ? (
          <Loader2 className="size-4 animate-spin" />
        ) : deleted ? (
          <RotateCcw className="size-4" />
        ) : (
          <Trash2 className="size-4" />
        )}
        {deleted ? "Restaurer" : "Supprimer"}
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}

export function AddMemberForm({ orgId }: { orgId: string }) {
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
      const r = await addMemberAction(orgId, email.trim(), role);
      if (!r.ok) {
        setError(r.error ?? "Ajout impossible.");
        return;
      }
      setEmail("");
      setOk(true);
      router.refresh();
    });
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <Input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email d'un compte existant"
        required
        className="flex-1"
      />
      <select value={role} onChange={(e) => setRole(e.target.value as MembershipRole)} className={selectClass}>
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <UserPlus className="size-4" />}
        Ajouter
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
      {ok ? <span className="text-xs text-success">Membre ajouté.</span> : null}
    </form>
  );
}

export function MemberRoleControl({
  orgId,
  membershipId,
  current,
}: {
  orgId: string;
  membershipId: string;
  current: MembershipRole;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex items-center gap-2">
      <select
        value={current}
        disabled={pending}
        onChange={(e) => {
          const next = e.target.value as MembershipRole;
          if (next === current) return;
          startTransition(async () => {
            setError(null);
            const r = await changeMemberRoleAction(orgId, membershipId, next);
            if (!r.ok) setError(r.error ?? "Erreur");
            router.refresh();
          });
        }}
        className={selectClass}
      >
        {ASSIGNABLE_ROLES.map((r) => (
          <option key={r.value} value={r.value}>
            {r.label}
          </option>
        ))}
      </select>
      <Button
        type="button"
        size="icon"
        variant="ghost"
        className="text-danger hover:bg-danger/10"
        disabled={pending}
        aria-label="Retirer le membre"
        onClick={() => {
          if (!window.confirm("Retirer ce membre de l'organisation ?")) return;
          startTransition(async () => {
            setError(null);
            const r = await removeMemberAction(orgId, membershipId);
            if (!r.ok) setError(r.error ?? "Erreur");
            router.refresh();
          });
        }}
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <X className="size-4" />}
      </Button>
      {error ? <span className="text-xs text-danger">{error}</span> : null}
    </div>
  );
}
