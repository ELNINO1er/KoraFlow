"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { createFormAction, type FormState } from "@/features/forms/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

const initial: FormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Créer le formulaire
    </Button>
  );
}

export function CreateFormForm() {
  const [state, action] = useActionState(createFormAction, initial);
  return (
    <Card>
      <form action={action}>
        <CardContent className="flex flex-col gap-4 p-6">
          {state.error ? (
            <p role="alert" className="rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          ) : null}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nom du formulaire *</Label>
            <Input id="name" name="name" required minLength={2} placeholder="Ex. Demande de devis" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={2} />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-3 px-6">
          <Button asChild variant="outline" type="button">
            <Link href="/formulaires">Annuler</Link>
          </Button>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
