"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import type { ServiceFormState } from "@/features/services/actions";
import { SERVICE_UNITS } from "@/lib/validation/service";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter } from "@/components/ui/card";

export interface ServiceFormValues {
  name: string;
  description: string;
  priceMajor: number;
  unit: string;
  category: string;
  taxRate: number;
  estimatedDurationMinutes: string;
  active: boolean;
}

const EMPTY: ServiceFormValues = {
  name: "",
  description: "",
  priceMajor: 0,
  unit: "forfait",
  category: "",
  taxRate: 18,
  estimatedDurationMinutes: "",
  active: true,
};

const selectClass =
  "flex h-10 w-full rounded-lg border border-input bg-surface px-3 text-sm text-foreground shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const initialState: ServiceFormState = { error: null };

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

export function ServiceForm({
  action,
  defaultValues,
  submitLabel,
  currencyLabel,
}: {
  action: (
    prev: ServiceFormState,
    formData: FormData,
  ) => Promise<ServiceFormState>;
  defaultValues?: Partial<ServiceFormValues>;
  submitLabel: string;
  currencyLabel: string;
}) {
  const [state, formAction] = useActionState(action, initialState);
  const v = { ...EMPTY, ...defaultValues };
  const errors = state.fieldErrors ?? {};

  return (
    <Card>
      <form action={formAction}>
        <CardContent className="grid gap-4 p-6 sm:grid-cols-2">
          {state.error ? (
            <p
              role="alert"
              className="sm:col-span-2 rounded-lg bg-danger/10 px-3 py-2 text-sm text-danger"
            >
              {state.error}
            </p>
          ) : null}

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="name">Nom du service *</Label>
            <Input id="name" name="name" required defaultValue={v.name} />
            <FieldError message={errors.name} />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="priceMajor">Prix HT ({currencyLabel}) *</Label>
            <Input
              id="priceMajor"
              name="priceMajor"
              type="number"
              min="0"
              step="0.01"
              required
              defaultValue={v.priceMajor}
            />
            <FieldError message={errors.priceMajor} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="unit">Unité</Label>
            <select id="unit" name="unit" defaultValue={v.unit} className={selectClass}>
              {SERVICE_UNITS.map((u) => (
                <option key={u} value={u}>
                  {u}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="taxRate">Taxe (%)</Label>
            <Input
              id="taxRate"
              name="taxRate"
              type="number"
              min="0"
              max="100"
              defaultValue={v.taxRate}
            />
            <FieldError message={errors.taxRate} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="category">Catégorie</Label>
            <Input
              id="category"
              name="category"
              defaultValue={v.category}
              placeholder="Conseil, Développement…"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="estimatedDurationMinutes">Durée estimée (min)</Label>
            <Input
              id="estimatedDurationMinutes"
              name="estimatedDurationMinutes"
              type="number"
              min="0"
              defaultValue={v.estimatedDurationMinutes}
            />
          </div>
          <label className="flex items-center gap-2 self-end pb-2 text-sm text-foreground">
            <input
              type="checkbox"
              name="active"
              defaultChecked={v.active}
              className="size-4 rounded border-input accent-[color:var(--color-primary)]"
            />
            Service actif
          </label>

          <div className="flex flex-col gap-1.5 sm:col-span-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" name="description" rows={3} defaultValue={v.description} />
          </div>
        </CardContent>
        <CardFooter className="justify-end gap-3 px-6">
          <Button asChild variant="outline" type="button">
            <Link href="/services">Annuler</Link>
          </Button>
          <SubmitButton label={submitLabel} />
        </CardFooter>
      </form>
    </Card>
  );
}
