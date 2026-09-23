import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFormBySlug } from "@/server/repositories/form-repository";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PublicForm } from "@/features/forms/public-form";

export const metadata: Metadata = { title: "Formulaire" };

export default async function PublicFormPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const form = await getFormBySlug(slug);
  if (!form) notFound();

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-xl flex-col justify-center gap-6 px-4 py-10">
      <div className="text-center">
        <span className="font-display text-lg font-bold text-primary">{form.organization.name}</span>
        <p className="text-xs text-muted-foreground">via KoraFlow</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">{form.name}</CardTitle>
          {form.description ? <p className="text-sm text-muted-foreground">{form.description}</p> : null}
        </CardHeader>
        <CardContent>
          {form.fields.length === 0 ? (
            <p className="text-sm text-muted-foreground">Ce formulaire n’a pas encore de champ.</p>
          ) : (
            <PublicForm
              slug={form.slug}
              fields={form.fields.map((f) => ({
                id: f.id,
                label: f.label,
                type: f.type,
                required: f.required,
                placeholder: f.placeholder,
                options: f.options,
              }))}
            />
          )}
        </CardContent>
      </Card>

      <p className="text-center text-xs text-muted-foreground">
        Vos informations sont transmises à {form.organization.name}.
      </p>
    </main>
  );
}
