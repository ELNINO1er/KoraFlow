"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2 } from "lucide-react";
import {
  createOrganizationAction,
  type CreateOrgState,
} from "@/features/organizations/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
  CardFooter,
} from "@/components/ui/card";

const initialState: CreateOrgState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Créer mon entreprise
    </Button>
  );
}

export function CreateOrgForm() {
  const [state, action] = useActionState(createOrganizationAction, initialState);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Créez votre entreprise</CardTitle>
        <CardDescription>
          Dernière étape avant d’accéder à votre espace KoraFlow.
        </CardDescription>
      </CardHeader>
      <form action={action}>
        <CardContent className="flex flex-col gap-4">
          {state.error ? (
            <p
              role="alert"
              className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {state.error}
            </p>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nom de l’entreprise</Label>
            <Input
              id="name"
              name="name"
              required
              minLength={2}
              placeholder="Ex. Agence Baobab"
            />
            <p className="text-xs text-muted-foreground">
              Devise par défaut : FCFA (XOF) · Fuseau : Abidjan · modifiable ensuite.
            </p>
          </div>
        </CardContent>
        <CardFooter className="pt-0">
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
