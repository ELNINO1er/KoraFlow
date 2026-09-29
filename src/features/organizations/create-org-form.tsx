"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, ArrowRight } from "lucide-react";
import {
  createOrganizationAction,
  type CreateOrgState,
} from "@/features/organizations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/field";
import { AuthShell } from "@/features/auth/auth-shell";
import { AuthStepper } from "@/features/auth/auth-stepper";

const initialState: CreateOrgState = { error: null };

const PHRASES = ["Votre espace prend forme.", "Plus qu'une étape."];

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" size="lg" disabled={pending} className="w-full">
      {pending ? <Loader2 className="size-4 animate-spin" /> : <ArrowRight className="size-4" />}
      Créer mon entreprise
    </Button>
  );
}

export function CreateOrgForm() {
  const [state, action] = useActionState(createOrganizationAction, initialState);

  return (
    <AuthShell phrases={PHRASES}>
      <AuthStepper current={2} />

      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-foreground">
          Créez votre entreprise
        </h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Dernière étape avant d&apos;accéder à votre espace KoraFlow.
        </p>
      </div>

      <form action={action} className="mt-8 flex flex-col gap-4">
        {state.error ? (
          <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
            {state.error}
          </p>
        ) : null}
        <Field
          id="org-name"
          label="Nom de l'entreprise"
          hint="Devise par défaut : FCFA (XOF) · Fuseau : Abidjan · modifiable ensuite."
        >
          <Input name="name" required minLength={2} placeholder="Ex. Agence Baobab" />
        </Field>
        <SubmitButton />
      </form>
    </AuthShell>
  );
}
