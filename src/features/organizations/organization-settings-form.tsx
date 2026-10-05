"use client";

import { useState, useTransition } from "react";
import { CheckCircle2, Loader2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import type { OrganizationSettingsInput } from "@/server/services/organization-service";
import { updateOrganizationSettingsAction, type OrganizationSettingsActionResult } from "./settings-actions";

type FormData = { [K in keyof OrganizationSettingsInput]: string };

function value(value: string | null) {
  return value ?? "";
}

export function OrganizationSettingsForm({ initial }: { initial: OrganizationSettingsInput }) {
  const [form, setForm] = useState<FormData>({
    name: initial.name,
    legalName: value(initial.legalName),
    email: value(initial.email),
    phone: value(initial.phone),
    addressLine1: value(initial.addressLine1),
    addressLine2: value(initial.addressLine2),
    city: value(initial.city),
    country: initial.country,
    currency: initial.currency,
    timezone: initial.timezone,
    locale: initial.locale,
    taxId: value(initial.taxId),
    taxRegime: value(initial.taxRegime),
    invoicePrefix: initial.invoicePrefix,
    quotePrefix: initial.quotePrefix,
    brandColor: value(initial.brandColor),
  });
  const [result, setResult] = useState<OrganizationSettingsActionResult | null>(null);
  const [pending, startTransition] = useTransition();

  function set<K extends keyof FormData>(key: K, next: FormData[K]) {
    setResult(null);
    setForm((current) => ({ ...current, [key]: next }));
  }

  return (
    <form
      className="flex flex-col gap-6"
      onSubmit={(event) => {
        event.preventDefault();
        startTransition(async () => setResult(await updateOrganizationSettingsAction(form)));
      }}
    >
      {result ? (
        <p role={result.ok ? "status" : "alert"} className={result.ok ? "flex items-center gap-2 rounded-lg bg-success/10 px-4 py-3 text-sm text-success" : "rounded-lg bg-danger/10 px-4 py-3 text-sm text-danger"}>
          {result.ok ? <CheckCircle2 className="size-4" aria-hidden="true" /> : null}
          {result.ok ? result.message : result.error}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Identité et coordonnées</CardTitle>
          <CardDescription>Ces informations apparaîtront progressivement sur vos documents commerciaux.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field id="org-name" label="Nom commercial" required><Input required minLength={2} maxLength={120} value={form.name} onChange={(e) => set("name", e.target.value)} /></Field>
          <Field id="org-legal-name" label="Raison sociale"><Input maxLength={160} value={form.legalName} onChange={(e) => set("legalName", e.target.value)} /></Field>
          <Field id="org-email" label="E-mail professionnel"><Input type="email" autoComplete="email" value={form.email} onChange={(e) => set("email", e.target.value)} /></Field>
          <Field id="org-phone" label="Téléphone"><Input type="tel" autoComplete="tel" maxLength={40} value={form.phone} onChange={(e) => set("phone", e.target.value)} /></Field>
          <Field id="org-address-1" label="Adresse"><Input autoComplete="address-line1" maxLength={180} value={form.addressLine1} onChange={(e) => set("addressLine1", e.target.value)} /></Field>
          <Field id="org-address-2" label="Complément d’adresse"><Input autoComplete="address-line2" maxLength={180} value={form.addressLine2} onChange={(e) => set("addressLine2", e.target.value)} /></Field>
          <Field id="org-city" label="Ville"><Input autoComplete="address-level2" maxLength={100} value={form.city} onChange={(e) => set("city", e.target.value)} /></Field>
          <Field id="org-country" label="Pays (code ISO à 2 lettres)" hint="Exemple : CI"><Input required minLength={2} maxLength={2} value={form.country} onChange={(e) => set("country", e.target.value)} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Facturation et fiscalité</CardTitle>
          <CardDescription>Les préfixes servent à identifier les futurs devis et factures.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field id="org-tax-id" label="Identifiant fiscal / NCC"><Input maxLength={80} value={form.taxId} onChange={(e) => set("taxId", e.target.value)} /></Field>
          <Field id="org-tax-regime" label="Régime fiscal"><Input maxLength={120} value={form.taxRegime} onChange={(e) => set("taxRegime", e.target.value)} /></Field>
          <Field id="org-invoice-prefix" label="Préfixe des factures" required hint="Lettres, chiffres et tirets uniquement."><Input required maxLength={10} value={form.invoicePrefix} onChange={(e) => set("invoicePrefix", e.target.value)} /></Field>
          <Field id="org-quote-prefix" label="Préfixe des devis" required><Input required maxLength={10} value={form.quotePrefix} onChange={(e) => set("quotePrefix", e.target.value)} /></Field>
          <Field id="org-currency" label="Devise (code ISO à 3 lettres)" hint="Exemple : XOF"><Input required minLength={3} maxLength={3} value={form.currency} onChange={(e) => set("currency", e.target.value)} /></Field>
          <Field id="org-brand-color" label="Couleur de marque" hint="Format hexadécimal, par exemple #C8553D"><Input type="text" pattern="#[0-9A-Fa-f]{6}" placeholder="#C8553D" value={form.brandColor} onChange={(e) => set("brandColor", e.target.value)} /></Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Régionalisation</CardTitle>
          <CardDescription>Ces valeurs déterminent la langue, les dates et les heures affichées.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <Field id="org-timezone" label="Fuseau horaire" required hint="Exemple : Africa/Abidjan"><Input required maxLength={80} value={form.timezone} onChange={(e) => set("timezone", e.target.value)} /></Field>
          <Field id="org-locale" label="Langue" required hint="Exemple : fr"><Input required maxLength={5} value={form.locale} onChange={(e) => set("locale", e.target.value)} /></Field>
        </CardContent>
      </Card>

      <div className="sticky bottom-20 flex justify-end rounded-xl border border-border bg-background/95 p-3 shadow-lg backdrop-blur md:bottom-4">
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
          Enregistrer les paramètres
        </Button>
      </div>
    </form>
  );
}
