import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CheckCircle2, Download } from "lucide-react";
import { getContractByToken } from "@/server/repositories/contract-repository";
import { contractStatusLabel, contractStatusVariant } from "@/lib/constants/contracts";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SignForm } from "@/features/contracts/sign-form";
import { PoweredByAlymero } from "@/components/brand/powered-by-alymero";
import { OrganizationBrand } from "@/components/brand/organization-brand";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Signature du contrat" };

export default async function PublicContractPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const contract = await getContractByToken(token);
  if (!contract) notFound();

  const localeTag = contract.organization.locale === "fr" ? "fr-FR" : contract.organization.locale;
  const dtf = new Intl.DateTimeFormat(localeTag, { dateStyle: "medium", timeStyle: "short" });

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col gap-6 px-4 py-10">
      <div className="flex items-center justify-between">
        <div>
          <OrganizationBrand id={contract.organization.id} name={contract.organization.name} hasLogo={Boolean(contract.organization.logoUrl)} className="text-xl text-primary" imageClassName="size-12" priority />
          <PoweredByAlymero />
        </div>
        <Badge variant={contractStatusVariant(contract.status)}>
          {contractStatusLabel(contract.status)}
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{contract.title}</CardTitle>
          <p className="text-sm text-muted-foreground">Contrat {contract.number}</p>
        </CardHeader>
        <CardContent>
          <pre className="whitespace-pre-wrap font-sans text-sm text-foreground">
            {contract.content}
          </pre>
        </CardContent>
      </Card>

      <Button asChild variant="outline" className="self-start">
        <a href={`/api/c/${token}/pdf`}>
          <Download className="size-4" />
          Télécharger le contrat{contract.status === "SIGNED" ? " signé" : ""}
        </a>
      </Button>

      {contract.status === "SENT" ? (
        <Card>
          <CardHeader>
            <CardTitle>Signature</CardTitle>
          </CardHeader>
          <CardContent>
            <SignForm token={token} />
          </CardContent>
        </Card>
      ) : contract.status === "SIGNED" ? (
        <div className="flex flex-col gap-1 rounded-lg bg-success/10 px-4 py-3 text-success">
          <span className="flex items-center gap-2 font-medium">
            <CheckCircle2 className="size-5" />
            Contrat signé
          </span>
          <span className="text-sm">
            Signé par {contract.signerName}
            {contract.signedAt ? ` le ${dtf.format(contract.signedAt)}` : ""}.
          </span>
        </div>
      ) : (
        <p className="text-center text-sm text-muted-foreground">
          Ce contrat n’est pas disponible pour signature.
        </p>
      )}

      <p className="text-center text-xs text-muted-foreground">
        Signature électronique simple avec horodatage et empreinte SHA-256 —
        non « qualifiée » au sens réglementaire.
      </p>
    </main>
  );
}
