"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldPlus } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { createPlatformAdminAction, promoteAdminByEmailAction } from "./actions";

export function AddAdminForm() {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  return <div className="flex flex-col gap-2">
    <Button onClick={() => { setMessage(""); setOpen(true); }}><ShieldPlus className="size-4" /> Ajouter un administrateur</Button>
    {message ? <p role="status" className="max-w-lg text-sm text-success">{message}</p> : null}
    <Dialog open={open} onOpenChange={setOpen}>
      {open ? <AdminFormContent onDone={(value) => { setMessage(value); setOpen(false); }} /> : null}
    </Dialog>
  </div>;
}

function AdminFormContent({ onDone }: { onDone: (message: string) => void }) {
  const [mode, setMode] = useState("existing");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [initialPassword, setInitialPassword] = useState("");
  const [password, setPassword] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return <DialogContent className="max-h-[90dvh] overflow-y-auto">
    <DialogHeader>
      <DialogTitle>Ajouter un administrateur plateforme</DialogTitle>
      <DialogDescription>Cet accès permet de gérer toutes les organisations et les utilisateurs d’Alymero. Il est distinct du rôle administrateur d’une entreprise.</DialogDescription>
    </DialogHeader>
    <form className="flex flex-col gap-4" onSubmit={(e) => {
      e.preventDefault();
      startTransition(async () => {
        setError(null);
        const confirmation = { password, reason };
        const result = mode === "existing"
          ? await promoteAdminByEmailAction(email, confirmation)
          : await createPlatformAdminAction({ email, name, initialPassword }, confirmation);
        setPassword("");
        if (!result.ok) { setError(result.error ?? "Ajout impossible."); return; }
        setInitialPassword("");
        onDone(result.message ?? "Administrateur ajouté.");
        router.refresh();
      });
    }}>
      <fieldset disabled={pending} className="flex flex-col gap-4">
        <legend className="sr-only">Informations de l’administrateur</legend>
        <Field id="admin-mode" label="Type d’ajout">
          <select className="h-11 rounded-lg border border-input bg-background px-3 text-sm" value={mode} onChange={(e) => { setMode(e.target.value); setError(null); setInitialPassword(""); }}>
            <option value="existing">Compte existant</option><option value="new">Nouveau compte</option>
          </select>
        </Field>
        <Field id="new-admin-email" label="E-mail du nouvel administrateur" required>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={254} required />
        </Field>
        {mode === "new" ? <>
          <Field id="new-admin-name" label="Nom complet" required>
            <Input value={name} onChange={(e) => setName(e.target.value)} minLength={2} maxLength={120} required />
          </Field>
          <Field id="new-admin-initial-password" label="Mot de passe initial du nouveau compte" hint="12 caractères minimum. Son adresse devra être vérifiée par e-mail." required>
            <Input type="password" autoComplete="new-password" value={initialPassword} onChange={(e) => setInitialPassword(e.target.value)} minLength={12} maxLength={128} required />
          </Field>
        </> : null}
        <Field id="new-admin-reason" label="Motif de l’attribution" required>
          <Input value={reason} onChange={(e) => setReason(e.target.value)} minLength={5} maxLength={500} required />
        </Field>
        <Field id="new-admin-confirm-password" label="Votre mot de passe pour confirmer" required>
          <Input type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} maxLength={128} required />
        </Field>
        {error ? <p role="alert" className="text-sm text-danger">{error}</p> : null}
        <Button type="submit" disabled={pending}>{pending ? "Ajout en cours…" : "Accorder l’accès administrateur"}</Button>
      </fieldset>
    </form>
  </DialogContent>;
}
