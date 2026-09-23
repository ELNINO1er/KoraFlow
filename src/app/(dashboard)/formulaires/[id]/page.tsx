import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { getForm, listSubmissions } from "@/server/services/form-service";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { FieldBuilder } from "@/features/forms/field-builder";
import { DeleteFormButton } from "@/features/forms/delete-form-button";

export const metadata: Metadata = { title: "Formulaire" };

export default async function FormDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireAuthContext();
  const { id } = await params;
  const form = await getForm(ctx, id);
  if (!form) notFound();

  const submissions = await listSubmissions(ctx, id);
  const canUpdate = can(ctx.role, "forms.update");
  const canDelete = can(ctx.role, "forms.delete");
  const appUrl = process.env.APP_URL ?? "";
  const publicUrl = `${appUrl}/f/${form.slug}`;
  const localeTag = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const dtf = new Intl.DateTimeFormat(localeTag, { dateStyle: "medium", timeStyle: "short" });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link href="/formulaires" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Retour aux formulaires
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-foreground">{form.name}</h1>
            {form.active ? <Badge variant="success">Actif</Badge> : <Badge variant="outline">Inactif</Badge>}
          </div>
          <div className="flex items-center gap-2">
            <a href={`/f/${form.slug}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-sm text-accent hover:underline">
              <ExternalLink className="size-4" />
              Voir la page publique
            </a>
            {canDelete ? <DeleteFormButton id={form.id} /> : null}
          </div>
        </div>
        <div className="mt-2 rounded-lg bg-muted/40 px-3 py-2">
          <p className="text-xs font-medium text-foreground">Lien public à partager</p>
          <code className="break-all text-xs text-muted-foreground">{publicUrl}</code>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle>Champs</CardTitle></CardHeader>
          <CardContent>
            <FieldBuilder
              formId={form.id}
              canEdit={canUpdate}
              fields={form.fields.map((f) => ({ id: f.id, label: f.label, type: f.type, required: f.required }))}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle>Soumissions ({form._count.submissions})</CardTitle></CardHeader>
          <CardContent>
            {submissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">Aucune soumission pour l’instant.</p>
            ) : (
              <ul className="flex flex-col gap-3">
                {submissions.map((s) => (
                  <li key={s.id} className="border-b border-border pb-2 last:border-0">
                    {s.contact ? (
                      <Link href={`/clients/${s.contact.id}`} className="text-sm font-medium text-foreground hover:text-accent">
                        {s.contact.firstName} {s.contact.lastName ?? ""}
                      </Link>
                    ) : (
                      <span className="text-sm text-foreground">Anonyme</span>
                    )}
                    <p className="text-xs text-muted-foreground">{dtf.format(s.createdAt)}</p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
