export function safeAttachmentFilename(filename: string): string {
  const normalized = filename
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 140);
  return normalized || "document";
}

export function privateFileResponse(
  bytes: Uint8Array,
  filename: string,
  mimeType: string,
): Response {
  return new Response(new Uint8Array(bytes), {
    headers: {
      "Content-Type": mimeType,
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `attachment; filename="${safeAttachmentFilename(filename)}"`,
      "Cache-Control": "private, no-store, max-age=0",
      Pragma: "no-cache",
      "X-Content-Type-Options": "nosniff",
      "X-Robots-Tag": "noindex, nofollow, noarchive",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
    },
  });
}
