import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { getContract } from "@/server/services/contract-service";
import { contractStatusLabel, contractStatusVariant } from "@/lib/constants/contracts";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { SendForSignatureButton, DeleteContractButton } from "@/features/contracts/contract-controls";

export const metadata: Metadata = { title: "Contrat" };

const EVENT_LABEL: Record<string, string> = {
  VIEWED: "Consultation",
  CONSENT: "Consentement",
  SIGNED: "Signature",
};

export default async function ContractDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const ctx = await requireAuthContext();
  const { id } = await params;
  const contract = await getContract(ctx, id);
  if (!contract) notFound();

  const localeTag = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const dtf = new Intl.DateTimeFormat(localeTag, { dateStyle: "medium", timeStyle: "short" });
  const canUpdate = can(ctx.role, "contracts.update");
  const canDelete = can(ctx.role, "contracts.delete");
  const appUrl = process.env.APP_URL ?? "";
  const signUrl = contract.publicToken ? `${appUrl}/c/${contract.publicToken}` : null;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <Link href="/contrats" className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="size-4" />
          Retour aux contrats
        </Link>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-display text-2xl font-bold text-foreground">{contract.number}</h1>
            <Badge variant={contractStatusVariant(contract.status)}>
              {contractStatusLabel(contract.status)}
            </Badge>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {canUpdate && contract.status === "DRAFT" ? <SendForSignatureButton id={contract.id} /> : null}
            {canDelete && contract.status !== "SIGNED" ? <DeleteContractButton id={contract.id} /> : null}
          </div>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">{contract.title}</p>
      </div>

      {/* Lien de signature à partager (quand envoyé) */}
      {contract.status === "SENT" && signUrl ? (
        <div className="rounded-lg border border-border bg-muted/40 px-4 py-3 text-sm">
          <p className="mb-1 font-medium text-foreground">Lien de signature client</p>
          <code className="break-all text-xs text-muted-foreground">{signUrl}</code>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Contenu du contrat</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">
              {contract.content}
            </pre>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-6">
          {contract.status === "SIGNED" ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShieldCheck className="size-4 text-success" />
                  Signature
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2 text-sm">
                <Info label="Signataire" value={contract.signerName} />
                <Info label="E-mail" value={contract.signerEmail} />
                <Info label="Date" value={contract.signedAt ? dtf.format(contract.signedAt) : null} />
                <Info label="Adresse IP" value={contract.signerIp} />
                <div>
                  <p className="text-xs text-muted-foreground">Empreinte SHA-256</p>
                  <code className="break-all text-xs text-foreground">{contract.contentHash}</code>
                </div>
              </CardContent>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>Journal</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-3">
                {contract.events.map((e) => (
                  <li key={e.id} className="flex gap-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-accent" />
                    <div>
                      <p className="text-sm text-foreground">{EVENT_LABEL[e.type] ?? e.type}</p>
                      <p className="text-xs text-muted-foreground">
                        {e.actorName ? `${e.actorName} · ` : ""}
                        {dtf.format(e.createdAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">
        Signature électronique simple avec horodatage et empreinte SHA-256. Ce
        dispositif n’est pas une signature « qualifiée » au sens réglementaire.
      </p>
    </div>
  );
}

function Info({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-foreground">{value ?? "—"}</p>
    </div>
  );
}
