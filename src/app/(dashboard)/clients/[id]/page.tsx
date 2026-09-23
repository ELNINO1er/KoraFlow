import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Building2, Mail, Phone, Tag } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { getContact } from "@/server/services/contact-service";
import {
  stageLabel,
  stageVariant,
  contactTypeLabel,
} from "@/lib/constants/crm";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { StageSelect } from "@/features/contacts/stage-select";
import { NoteForm } from "@/features/contacts/note-form";
import { ConvertToClientButton } from "@/features/contacts/convert-button";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";

export const metadata: Metadata = { title: "Fiche contact" };

const dtf = new Intl.DateTimeFormat("fr-FR", {
  dateStyle: "medium",
  timeStyle: "short",
});

function activityText(a: {
  type: string;
  content: string | null;
  metadata: unknown;
}): string {
  switch (a.type) {
    case "CREATED":
      return "Contact créé";
    case "NOTE":
      return a.content ?? "Note";
    case "STAGE_CHANGED": {
      const m = a.metadata as { from?: string; to?: string } | null;
      const from = m?.from ? stageLabel(m.from as never) : "?";
      const to = m?.to ? stageLabel(m.to as never) : "?";
      return `Étape : ${from} → ${to}`;
    }
    case "CALL":
      return a.content ?? "Appel";
    case "EMAIL":
      return a.content ?? "E-mail";
    case "TASK":
      return a.content ?? "Tâche";
    default:
      return a.type;
  }
}

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireAuthContext();
  const { id } = await params;

  const result = await getContact(ctx, id);
  if (!result) notFound();

  const { contact, activities } = result;
  const canUpdate = can(ctx.role, "contacts.update");
  const fullName = `${contact.firstName} ${contact.lastName ?? ""}`.trim();
  const appUrl = process.env.APP_URL ?? "";
  const portalUrl = contact.portalToken ? `${appUrl}/portail/${contact.portalToken}` : null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link
          href="/clients"
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" />
          Retour aux clients
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-foreground">
              {fullName}
            </h1>
            <Badge variant={stageVariant(contact.stage)}>
              {stageLabel(contact.stage)}
            </Badge>
            <Badge variant="outline">{contactTypeLabel(contact.type)}</Badge>
          </div>
          {canUpdate ? (
            <div className="flex flex-wrap items-center gap-2">
              {contact.type === "PROSPECT" ? <ConvertToClientButton id={contact.id} /> : null}
              <Button asChild variant="outline" size="sm">
                <Link href={`/clients/${contact.id}/modifier`}>
                  <Pencil className="size-4" />
                  Modifier
                </Link>
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Colonne principale */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Coordonnées</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-3 sm:grid-cols-2">
              <Info icon={<Building2 className="size-4" />} label="Entreprise" value={contact.companyName} />
              <Info icon={<Mail className="size-4" />} label="E-mail" value={contact.email} />
              <Info icon={<Phone className="size-4" />} label="Téléphone" value={contact.phone} />
              <Info icon={<Tag className="size-4" />} label="Origine" value={contact.source} />
              {contact.notes ? (
                <div className="sm:col-span-2">
                  <p className="text-xs text-muted-foreground">Note</p>
                  <p className="text-sm text-foreground">{contact.notes}</p>
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Historique</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {canUpdate ? <NoteForm contactId={contact.id} /> : null}
              <ul className="flex flex-col gap-3">
                {activities.map((a) => (
                  <li key={a.id} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-foreground">{activityText(a)}</p>
                      <p className="text-xs text-muted-foreground">
                        {a.actor?.name ? `${a.actor.name} · ` : ""}
                        {dtf.format(a.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Colonne latérale */}
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Pipeline</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-xs text-muted-foreground">Étape actuelle</p>
              {canUpdate ? (
                <StageSelect contactId={contact.id} current={contact.stage} />
              ) : (
                <Badge variant={stageVariant(contact.stage)}>
                  {stageLabel(contact.stage)}
                </Badge>
              )}
            </CardContent>
          </Card>

          {portalUrl ? (
            <Card>
              <CardHeader>
                <CardTitle>Portail client</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <p className="text-xs text-muted-foreground">
                  Lien à partager : le client y retrouve ses devis, contrats,
                  factures, projets et rendez-vous.
                </p>
                <code className="break-all rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
                  {portalUrl}
                </code>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Info({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | null;
}) {
  return (
    <div>
      <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
        {icon}
        {label}
      </p>
      <p className="text-sm text-foreground">{value ?? "—"}</p>
    </div>
  );
}
