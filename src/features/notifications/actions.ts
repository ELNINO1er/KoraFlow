"use server";

import { revalidatePath } from "next/cache";
import { resolveSession } from "@/server/auth/context";
import { markAllRead } from "@/server/services/notification-service";

export async function markAllReadAction() {
  const session = await resolveSession();
  if (session.status !== "ok") return;
  await markAllRead(session.context);
  revalidatePath("/", "layout");
}
