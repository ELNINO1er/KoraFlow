import { prisma } from "@/server/database/client";
import { getPrivateFile } from "@/server/storage/private-storage";
import { organizationLogoContentType } from "@/lib/organizations/logo-validation";

export async function GET(request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null, suspendedAt: null },
    select: { logoUrl: true },
  });
  const key = organization?.logoUrl;
  if (!key?.startsWith(`organization-logos/${organizationId}/`)) {
    return new Response("Logo introuvable", { status: 404 });
  }
  // La clé change à chaque nouveau logo : elle sert d'ETag. Le navigateur
  // revalide à chaque affichage, donc un logo remplacé apparaît tout de suite.
  const etag = `"${key.split("/").pop()}"`;
  const cacheControl = "public, no-cache";
  if (request.headers.get("if-none-match") === etag) {
    return new Response(null, { status: 304, headers: { ETag: etag, "Cache-Control": cacheControl } });
  }
  try {
    const bytes = await getPrivateFile(key);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": organizationLogoContentType(key),
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": cacheControl,
        ETag: etag,
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Logo introuvable", { status: 404 });
  }
}
