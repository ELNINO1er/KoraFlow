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
  const logo = logoUrl
    ? `<img src="${escapeHtml(logoUrl)}" width="48" height="48" alt="${safeBrand}" style="display:block;max-width:48px;max-height:48px;object-fit:contain;border-radius:10px;background:#fff" />`
    : `<div style="width:44px;height:44px;border-radius:10px;background:#12263A;color:#fff;font:bold 18px Arial,sans-serif;line-height:44px;text-align:center">${escapeHtml(brandName.slice(0, 2).toUpperCase())}</div>`;
  const button = action
    ? `<p style="margin:28px 0"><a href="${escapeHtml(action.url)}" style="display:inline-block;background:#C8553D;color:#fff;text-decoration:none;font-weight:700;padding:13px 20px;border-radius:9px">${escapeHtml(action.label)}</a></p><p style="font-size:12px;color:#667085;word-break:break-all">Si le bouton ne fonctionne pas : ${escapeHtml(action.url)}</p>`
    : "";

  return `<!doctype html><html lang="fr"><body style="margin:0;background:#F4F6F8;padding:24px;font-family:Arial,sans-serif;color:#12263A"><table role="presentation" width="100%" cellspacing="0" cellpadding="0"><tr><td align="center"><table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:620px;background:#fff;border:1px solid #E4E7EC;border-radius:16px;overflow:hidden"><tr><td style="padding:24px 28px;border-bottom:1px solid #E4E7EC"><table role="presentation"><tr><td>${logo}</td><td style="padding-left:12px;font-size:20px;font-weight:800">${safeBrand}</td></tr></table></td></tr><tr><td style="padding:32px 28px"><h1 style="margin:0 0 16px;font-size:24px;line-height:1.3">${safeTitle}</h1>${intro ? `<p style="margin:0 0 14px;line-height:1.6">${escapeHtml(intro)}</p>` : ""}<div style="font-size:15px;line-height:1.65;color:#344054">${escapeHtml(body)}</div>${button}</td></tr><tr><td style="padding:18px 28px;background:#FAF7F2;font-size:12px;line-height:1.5;color:#667085">${escapeHtml(footer ?? `Message envoyé par ${brandName}.`)}</td></tr></table></td></tr></table></body></html>`;
}
