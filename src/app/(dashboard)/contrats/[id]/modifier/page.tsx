import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { requireAuthContext } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { getContract } from "@/server/services/contract-service";
import { ContractEditor } from "@/features/contracts/contract-editor";

export default async function EditContractPage({ params }: { params: Promise<{ id: string }> }) {
  const ctx = await requireAuthContext();
  if (!can(ctx.role, "contracts.update")) redirect("/contrats");
  const { id } = await params;
  const contract = await getContract(ctx, id);
  if (!contract) notFound();
  if (contract.status !== "DRAFT") redirect(`/contrats/${id}`);
  const clientName = contract.contact.companyName ?? `${contract.contact.firstName} ${contract.contact.lastName ?? ""}`.trim();
  return <div className="mx-auto flex max-w-7xl flex-col gap-6"><div><Link href={`/contrats/${id}`} className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="size-4" />Retour au contrat</Link><h1 className="font-display text-2xl font-bold">Modifier {contract.number}</h1><p className="mt-1 text-sm text-muted-foreground">Relisez et adaptez le texte avant l’envoi. Une fois envoyé, le contenu sera verrouillé.</p></div><ContractEditor contract={{ id: contract.id, number: contract.number, title: contract.title, content: contract.content, clientName, organization: { id: ctx.organizationId, name: ctx.organization.name, hasLogo: Boolean(ctx.organization.logoUrl) } }} /></div>;
}
