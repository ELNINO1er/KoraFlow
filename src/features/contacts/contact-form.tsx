"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import {
  createContactAction,
  type ContactFormState,
} from "@/features/contacts/actions";
import { CONTACT_STAGES, CONTACT_TYPES } from "@/lib/constants/crm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

const initialState: ContactFormState = { error: null };

const selectClass =
  "flex h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      Enregistrer le contact
    </Button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-danger">{message}</p>;
}

export function ContactForm() {
  const [state, action] = useActionState(createContactAction, initialState);
  const errors = state.fieldErrors ?? {};

  return (
    <Card>
      <form action={action}>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          {state.error ? (
            <p
              role="alert"
              className="sm:col-span-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {state.error}
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstName">Prénom *</Label>
            <Input id="firstName" name="firstName" required />
            <FieldError message={errors.firstName} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lastName">Nom</Label>
            <Input id="lastName" name="lastName" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companyName">Entreprise</Label>
            <Input id="companyName" name="companyName" />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="source">Origine</Label>
            <Input id="source" name="source" placeholder="Formulaire, référence…" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" />
            <FieldError message={errors.email} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" name="phone" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">Type</Label>
            <select id="type" name="type" defaultValue="PROSPECT" className={selectClass}>
              {CONTACT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stage">Étape du pipeline</Label>
            <select id="stage" name="stage" defaultValue="NEW_REQUEST" className={selectClass}>
              {CONTACT_STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="notes">Note interne</Label>
            <Textarea id="notes" name="notes" rows={3} />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-3 px-6">
          <Button asChild variant="outline" type="button">
            <Link href="/clients">Annuler</Link>
          </Button>
          <SubmitButton />
        </CardFooter>
      </form>
    </Card>
  );
}
