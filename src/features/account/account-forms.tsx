"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { PasswordInput } from "@/components/ui/password-input";
import { PasswordStrength } from "@/components/ui/password-strength";
import {
  changePasswordAction,
  requestEmailChangeAction,
  updateProfileAction,
  type AccountActionResult,
} from "./actions";

function Feedback({ result }: { result: AccountActionResult | null }) {
  if (!result) return null;
  return (
    <p
      role={result.ok ? "status" : "alert"}
      className={result.ok
        ? "flex items-center gap-2 rounded-lg bg-success/10 px-3 py-2 text-sm text-success"
        : "rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger"}
    >
      {result.ok ? <CheckCircle2 className="size-4 shrink-0" /> : null}
      {result.ok ? result.message : result.error}
    </p>
  );
}

export function AccountForms({ name: initialName, email }: { name: string; email: string }) {
  const [profilePending, startProfile] = useTransition();
  const [emailPending, startEmail] = useTransition();
  const [passwordPending, startPassword] = useTransition();
  const [name, setName] = useState(initialName);
  const [newEmail, setNewEmail] = useState("");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [profileResult, setProfileResult] = useState<AccountActionResult | null>(null);
  const [emailResult, setEmailResult] = useState<AccountActionResult | null>(null);
  const [passwordResult, setPasswordResult] = useState<AccountActionResult | null>(null);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Identité du compte</CardTitle>
          <CardDescription>Ce nom apparaît dans l’accueil et dans votre menu personnel.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setProfileResult(null);
              startProfile(async () => setProfileResult(await updateProfileAction(name)));
            }}
          >
            <Feedback result={profileResult} />
            <Field id="account-name" label="Nom affiché">
              <Input
                id="account-name"
                autoComplete="name"
                required
                minLength={2}
                maxLength={120}
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </Field>
            <Button type="submit" disabled={profilePending || name.trim() === initialName.trim()} className="self-start">
              {profilePending ? <Loader2 className="animate-spin" /> : null}
              Enregistrer le nom
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Adresse e-mail</CardTitle>
          <CardDescription>La nouvelle adresse doit être confirmée avant d’être appliquée.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault();
              setEmailResult(null);
              startEmail(async () => setEmailResult(await requestEmailChangeAction(newEmail)));
            }}
          >
            <Feedback result={emailResult} />
            <Field id="current-email" label="Adresse actuelle">
              <Input id="current-email" type="email" value={email} disabled />
            </Field>
            <Field id="new-email" label="Nouvelle adresse e-mail">
              <Input
                id="new-email"
                type="email"
                autoComplete="email"
                required
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
              />
            </Field>
            <Button type="submit" disabled={emailPending || !newEmail.trim()} className="self-start">
              {emailPending ? <Loader2 className="animate-spin" /> : null}
              Vérifier la nouvelle adresse
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Mot de passe</CardTitle>
          <CardDescription>La modification déconnectera automatiquement vos autres sessions.</CardDescription>
        </CardHeader>
        <CardContent>
          <form
            className="grid gap-4 md:grid-cols-2"
            onSubmit={(event) => {
              event.preventDefault();
              setPasswordResult(null);
              startPassword(async () => {
                const result = await changePasswordAction({ currentPassword, newPassword, confirmPassword });
                setPasswordResult(result);
                if (result.ok) {
                  setCurrentPassword("");
                  setNewPassword("");
                  setConfirmPassword("");
                }
              });
            }}
          >
            <div className="md:col-span-2"><Feedback result={passwordResult} /></div>
            <Field id="current-password" label="Mot de passe actuel">
              <PasswordInput
                id="current-password"
                autoComplete="current-password"
                required
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
              />
            </Field>
            <div className="hidden md:block" aria-hidden="true" />
            <Field id="new-password" label="Nouveau mot de passe" hint="Au moins 8 caractères.">
              <PasswordInput
                id="new-password"
                autoComplete="new-password"
                required
                minLength={8}
                maxLength={128}
                value={newPassword}
                onChange={(event) => setNewPassword(event.target.value)}
              />
            </Field>
            <Field id="confirm-password" label="Confirmer le nouveau mot de passe">
              <PasswordInput
                id="confirm-password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
              />
            </Field>
            <div className="md:col-span-2"><PasswordStrength value={newPassword} /></div>
            <Button type="submit" disabled={passwordPending} className="justify-self-start md:col-span-2">
              {passwordPending ? <Loader2 className="animate-spin" /> : null}
              Modifier le mot de passe
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
