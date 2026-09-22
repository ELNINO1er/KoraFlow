"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveSession, type AuthContext } from "@/server/auth/context";
import * as contractService from "@/server/services/contract-service";
import { ContractError } from "@/server/services/contract-service";
import { PermissionError } from "@/server/permissions/permissions";

async function getContext(): Promise<AuthContext> {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "no-organization") redirect("/create-organization");
  return session.context;
}

export async function generateContractAction(
  quoteId: string,
): Promise<{ ok: boolean; contractId?: string; error?: string }> {
  const ctx = await getContext();
  try {
    const contract = await contractService.generateFromQuote(ctx, quoteId);
    revalidatePath("/contrats");
    return { ok: true, contractId: contract.id };
  } catch (e) {
    if (e instanceof ContractError) return { ok: false, error: e.message };
    if (e instanceof PermissionError)
      return { ok: false, error: "Permission insuffisante." };
    throw e;
  }
}

export async function sendContractAction(id: string) {
  const ctx = await getContext();
  try {
    await contractService.changeContractStatus(ctx, id, "SENT");
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath(`/contrats/${id}`);
  revalidatePath("/contrats");
}

export async function deleteContractAction(id: string) {
  const ctx = await getContext();
  try {
    await contractService.deleteContract(ctx, id);
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath("/contrats");
  redirect("/contrats");
}
