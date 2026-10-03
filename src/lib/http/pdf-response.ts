const PDF_HEADERS = {
  "Content-Type": "application/pdf",
  "Cache-Control": "private, no-store, max-age=0",
  Pragma: "no-cache",
  "X-Content-Type-Options": "nosniff",
  "X-Robots-Tag": "noindex, nofollow, noarchive",
  "Referrer-Policy": "no-referrer",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'self'",
} as const;

/** Produit un nom ASCII sûr pour l'en-tête HTTP Content-Disposition. */
export function safePdfFilename(filename: string): string {
  const withoutExtension = filename.replace(/\.pdf$/i, "");
  const normalized = withoutExtension
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);

  return `${normalized || "document"}.pdf`;
}

export function pdfResponse(buffer: Buffer, filename: string): Response {
  const safeFilename = safePdfFilename(filename);
  return new Response(new Uint8Array(buffer), {
    headers: {
      ...PDF_HEADERS,
      "Content-Disposition": `inline; filename="${safeFilename}"`,
    },
  });
}
