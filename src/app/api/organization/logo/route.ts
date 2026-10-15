import { revalidatePath } from "next/cache";
import { resolveSession } from "@/server/auth/context";
import { replaceOrganizationLogo, removeOrganizationLogo } from "@/server/services/organization-logo-service";
import { InvalidOrganizationLogoError, MAX_ORGANIZATION_LOGO_SIZE } from "@/lib/organizations/logo-validation";
import { PermissionError } from "@/server/permissions/permissions";

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  return Boolean(origin && origin === new URL(process.env.APP_URL || request.url).origin);
}

function redirectToSettings(request: Request, result: string) {
  const url = new URL("/parametres", request.url);
  url.searchParams.set("logo", result);
  return Response.redirect(url, 303);
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return new Response("Origine refusée", { status: 403 });
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_ORGANIZATION_LOGO_SIZE + 256 * 1024) {
    return redirectToSettings(request, "too-large");
  }
  const session = await resolveSession();
  if (session.status !== "ok") return new Response("Non autorisé", { status: 401 });
  try {
    const formData = await request.formData();
    const file = formData.get("logo");
    if (!(file instanceof File)) return redirectToSettings(request, "missing");
    await replaceOrganizationLogo(session.context, new Uint8Array(await file.arrayBuffer()));
    revalidatePath("/", "layout");
    return redirectToSettings(request, "updated");
  } catch (error) {
    if (error instanceof InvalidOrganizationLogoError) return redirectToSettings(request, "invalid");
    if (error instanceof PermissionError) return new Response("Accès refusé", { status: 403 });
    console.error("organization.logo_upload_failed", error instanceof Error ? error.message : "unknown");
    return redirectToSettings(request, "failed");
  }
}

export async function DELETE(request: Request) {
  if (!sameOrigin(request)) return new Response("Origine refusée", { status: 403 });
  const session = await resolveSession();
  if (session.status !== "ok") return new Response("Non autorisé", { status: 401 });
  try {
    await removeOrganizationLogo(session.context);
    revalidatePath("/", "layout");
    return Response.json({ ok: true });
  } catch (error) {
    if (error instanceof PermissionError) return new Response("Accès refusé", { status: 403 });
    return Response.json({ ok: false }, { status: 500 });
  }
}
