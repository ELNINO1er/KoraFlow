"use server";

import { redirect } from "next/navigation";
import { resolveSession } from "@/server/auth/context";
import { createSubscriptionCheckout, subscriptionMethod } from "@/server/services/subscription-checkout";

export async function startSubscription(formData: FormData) {
  const session = await resolveSession();
  if (session.status !== "trial-expired" || !session.canPay) redirect("/essai-termine");
  const method = subscriptionMethod.safeParse(formData.get("method"));
  if (!method.success) redirect("/essai-termine?paiement=echec");

  let url: string;
  try {
    url = await createSubscriptionCheckout(session.organization.id, method.data);
  } catch {
    redirect("/essai-termine?paiement=indisponible");
  }
  redirect(url);
}
