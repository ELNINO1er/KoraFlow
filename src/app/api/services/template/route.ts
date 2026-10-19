import { resolveSession } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { buildServiceTemplate } from "@/server/services/services-excel";
import { XLSX_CONTENT_TYPE } from "@/lib/excel/upload";

export async function GET() {
  const session = await resolveSession();
  if (session.status !== "ok") return new Response("Non autorisé", { status: 401 });
  if (!can(session.context.role, "services.create")) return new Response("Accès refusé", { status: 403 });

  const buffer = await buildServiceTemplate(session.context.organization.currency);
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="modele-services.xlsx"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
