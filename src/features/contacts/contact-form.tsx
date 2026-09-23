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

export interface ContactFormValues {
  firstName: string;
  lastName: string;
  companyName: string;
  source: string;
  email: string;
  phone: string;
  type: string;
  stage: string;
  notes: string;
}

const EMPTY: ContactFormValues = {
  firstName: "",
  lastName: "",
  companyName: "",
  source: "",
  email: "",
  phone: "",
  type: "PROSPECT",
  stage: "NEW_REQUEST",
  notes: "",
};

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-danger">{message}</p>;
}

export function ContactForm({
  action = createContactAction,
  defaultValues,
  submitLabel = "Enregistrer le contact",
  cancelHref = "/clients",
}: {
  action?: (prev: ContactFormState, formData: FormData) => Promise<ContactFormState>;
  defaultValues?: Partial<ContactFormValues>;
  submitLabel?: string;
  cancelHref?: string;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const errors = state.fieldErrors ?? {};
  const v = { ...EMPTY, ...defaultValues };

  return (
    <Card>
      <form action={formAction}>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          {state.error ? (
            <p role="alert" className="sm:col-span-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger">
              {state.error}
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="firstName">Prénom *</Label>
            <Input id="firstName" name="firstName" required defaultValue={v.firstName} />
            <FieldError message={errors.firstName} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="lastName">Nom</Label>
            <Input id="lastName" name="lastName" defaultValue={v.lastName} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="companyName">Entreprise</Label>
            <Input id="companyName" name="companyName" defaultValue={v.companyName} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="source">Origine</Label>
            <Input id="source" name="source" defaultValue={v.source} placeholder="Formulaire, référence…" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input id="email" name="email" type="email" defaultValue={v.email} />
            <FieldError message={errors.email} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="phone">Téléphone</Label>
            <Input id="phone" name="phone" defaultValue={v.phone} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="type">Type</Label>
            <select id="type" name="type" defaultValue={v.type} className={selectClass}>
              {CONTACT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="stage">Étape du pipeline</Label>
            <select id="stage" name="stage" defaultValue={v.stage} className={selectClass}>
              {CONTACT_STAGES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="notes">Note interne</Label>
            <Textarea id="notes" name="notes" rows={3} defaultValue={v.notes} />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-3 px-6">
          <Button asChild variant="outline" type="button">
            <Link href={cancelHref}>Annuler</Link>
          </Button>
          <SubmitButton label={submitLabel} />
        </CardFooter>
      </form>
    </Card>
  );
}
