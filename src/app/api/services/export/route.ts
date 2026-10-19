import { resolveSession } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { exportServicesWorkbook } from "@/server/services/services-excel";
import { XLSX_CONTENT_TYPE } from "@/lib/excel/upload";

export async function GET(request: Request) {
  const session = await resolveSession();
  if (session.status !== "ok") return new Response("Non autorisé", { status: 401 });
  if (!can(session.context.role, "services.view")) return new Response("Accès refusé", { status: 403 });

  const url = new URL(request.url);
  const buffer = await exportServicesWorkbook(session.context, {
    search: url.searchParams.get("q")?.trim() || undefined,
    activeOnly: url.searchParams.get("active") === "1",
  });
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="services.xlsx"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
