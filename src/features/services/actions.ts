"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveSession, type AuthContext } from "@/server/auth/context";
import * as catalog from "@/server/services/catalog-service";
import { serviceInputSchema } from "@/lib/validation/service";
import { minorUnitsFor } from "@/lib/formatting/currency";
import { PermissionError } from "@/server/permissions/permissions";
import type { ServiceWriteData } from "@/server/repositories/service-repository";

async function getContext(): Promise<AuthContext> {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "no-organization") redirect("/create-organization");
  return session.context;
}

export interface ServiceFormState {
  error: string | null;
  fieldErrors?: Record<string, string>;
}

function parseAndBuild(
  ctx: AuthContext,
  formData: FormData,
):
  | { ok: true; data: ServiceWriteData }
  | { ok: false; state: ServiceFormState } {
  const parsed = serviceInputSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    priceMajor: formData.get("priceMajor"),
    unit: formData.get("unit"),
    category: formData.get("category"),
    taxRate: formData.get("taxRate"),
    estimatedDurationMinutes: formData.get("estimatedDurationMinutes"),
    active: formData.get("active") === "on",
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = issue.path[0];
      if (typeof key === "string" && !fieldErrors[key]) {
        fieldErrors[key] = issue.message;
      }
    }
    return {
      ok: false,
      state: { error: "Veuillez corriger les champs indiqués.", fieldErrors },
    };
  }

  const minorUnits = minorUnitsFor(ctx.organization.currency);
  const priceMinor = Math.round(parsed.data.priceMajor * 10 ** minorUnits);

  return {
    ok: true,
    data: {
      name: parsed.data.name,
      description: parsed.data.description,
      priceMinor,
      unit: parsed.data.unit,
      category: parsed.data.category,
      taxRate: parsed.data.taxRate,
      estimatedDurationMinutes: parsed.data.estimatedDurationMinutes,
      active: parsed.data.active,
    },
  };
}

export async function createServiceAction(
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const ctx = await getContext();
  const result = parseAndBuild(ctx, formData);
  if (!result.ok) return result.state;

  try {
    await catalog.createService(ctx, result.data);
  } catch (e) {
    if (e instanceof PermissionError) {
      return { error: "Vous n'avez pas la permission de créer un service." };
    }
    throw e;
  }

  revalidatePath("/services");
  redirect("/services");
}

export async function updateServiceAction(
  id: string,
  _prev: ServiceFormState,
  formData: FormData,
): Promise<ServiceFormState> {
  const ctx = await getContext();
  const result = parseAndBuild(ctx, formData);
  if (!result.ok) return result.state;

  try {
    await catalog.updateService(ctx, id, result.data);
  } catch (e) {
    if (e instanceof PermissionError) {
      return { error: "Vous n'avez pas la permission de modifier ce service." };
    }
    throw e;
  }

  revalidatePath("/services");
  redirect("/services");
}

export async function deleteServiceAction(id: string) {
  const ctx = await getContext();
  try {
    await catalog.deleteService(ctx, id);
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath("/services");
  redirect("/services");
}
