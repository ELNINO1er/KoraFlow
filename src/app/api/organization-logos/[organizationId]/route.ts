import { prisma } from "@/server/database/client";
import { getPrivateFile } from "@/server/storage/private-storage";
import { organizationLogoContentType } from "@/lib/organizations/logo-validation";

export async function GET(_request: Request, { params }: { params: Promise<{ organizationId: string }> }) {
  const { organizationId } = await params;
  const organization = await prisma.organization.findFirst({
    where: { id: organizationId, deletedAt: null, suspendedAt: null },
    select: { logoUrl: true },
  });
  const key = organization?.logoUrl;
  if (!key?.startsWith(`organization-logos/${organizationId}/`)) {
    return new Response("Logo introuvable", { status: 404 });
  }
  try {
    const bytes = await getPrivateFile(key);
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": organizationLogoContentType(key),
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Logo introuvable", { status: 404 });
  }
}
