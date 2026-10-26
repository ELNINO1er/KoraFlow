import "server-only";

function escapeHtml(value: string) {
  return value.replace(/[&<>"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[character] ?? character);
}

export function brandedEmail({
  title,
  intro,
  body,
  action,
  brandName = "Alymero",
  logoUrl,
  footer,
}: {
  title: string;
  intro?: string;
  body: string;
  action?: { label: string; url: string };
  brandName?: string;
  logoUrl?: string | null;
  footer?: string;
}) {
  const safeBrand = escapeHtml(brandName);
  const safeTitle = escapeHtml(title);
  // Palette de marque (vert principal, bleu nuit pour le texte, fonds gris-vert), en styles
  // en ligne : seuls styles fiables dans les clients de messagerie.
  const GREEN = "#2F855A";
  const GREEN_DARK = "#1F5C43";
  const LINK = "#23744C";
  const INK = "#12263A";
  const MUTED = "#5B6B7B";
  const BORDER = "#E2E9E5";
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" width="44" height="44" alt="${safeBrand}" style="display:block;max-width:44px;max-height:44px;object-fit:contain;border-radius:10px;background:#fff" />`
    : `<div style="width:44px;height:44px;border-radius:10px;background:${GREEN_DARK};color:#fff;font:bold 17px Arial,sans-serif;line-height:44px;text-align:center">${escapeHtml(brandName.slice(0, 2).toUpperCase())}</div>`;
  const button = action
    ? `<table role="presentation" cellspacing="0" cellpadding="0" style="margin:28px 0 20px"><tr><td style="border-radius:10px;background:${GREEN}"><a href="${escapeHtml(action.url)}" style="display:inline-block;padding:14px 24px;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;border-radius:10px">${escapeHtml(action.label)}</a></td></tr></table><p style="margin:0;font-size:12px;line-height:1.6;color:${MUTED};word-break:break-all">Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br /><a href="${escapeHtml(action.url)}" style="color:${LINK};text-decoration:underline">${escapeHtml(action.url)}</a></p>`
    : "";

  return `<!doctype html><html lang="fr"><head><meta charset="utf-8" /><meta name="viewport" content="width=device-width,initial-scale=1" /><meta name="color-scheme" content="light" /></head><body style="margin:0;background:#F3F6F4;padding:24px 12px;font-family:Arial,Helvetica,sans-serif;color:${INK}"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:600px;background:#ffffff;border:1px solid ${BORDER};border-radius:16px;overflow:hidden"><tr><td style="height:5px;background:${GREEN};font-size:0;line-height:0">&nbsp;</td></tr><tr><td style="padding:22px 32px;border-bottom:1px solid ${BORDER}"><table role="presentation" cellspacing="0" cellpadding="0"><tr><td>${logo}</td><td style="padding-left:12px;font-size:19px;font-weight:800;color:${INK}">${safeBrand}</td></tr></table></td></tr><tr><td style="padding:32px"><h1 style="margin:0 0 16px;font-size:23px;line-height:1.3;color:${INK}">${safeTitle}</h1>${intro ? `<p style="margin:0 0 12px;font-size:15px;line-height:1.6;color:${INK}">${escapeHtml(intro)}</p>` : ""}<div style="font-size:15px;line-height:1.65;color:#3E4C59">${escapeHtml(body)}</div>${button}</td></tr><tr><td style="padding:18px 32px;background:#F1F8F4;border-top:1px solid ${BORDER};font-size:12px;line-height:1.6;color:${MUTED}">${escapeHtml(footer ?? `Message envoyé par ${brandName}.`)}</td></tr></table>${brandName === "Alymero" ? "" : `<p style="margin:16px 0 0;font-size:11px;color:#8696A6">Envoyé avec Alymero</p>`}</td></tr></table></body></html>`;
}