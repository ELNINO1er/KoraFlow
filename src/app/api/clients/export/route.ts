import { resolveSession } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { exportContactsWorkbook } from "@/server/services/contacts-excel";
import { XLSX_CONTENT_TYPE } from "@/lib/excel/upload";

/** Export .xlsx des clients autorisés (respecte les filtres de la liste). */
export async function GET(request: Request) {
  const session = await resolveSession();
  if (session.status !== "ok") return new Response("Non autorisé", { status: 401 });
  if (!can(session.context.role, "contacts.view")) return new Response("Accès refusé", { status: 403 });

  const url = new URL(request.url);
  const buffer = await exportContactsWorkbook(session.context, {
    search: url.searchParams.get("q")?.trim() || undefined,
    stage: url.searchParams.get("stage") || undefined,
    type: url.searchParams.get("type") || undefined,
  });

  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="clients.xlsx"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
