import { ImageResponse } from "next/og";

export const alt = "Alymero — CRM, devis, factures et projets pour les PME";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpenGraphImage() {
  return new ImageResponse(<div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", padding: "70px 80px", background: "#102334", color: "#ffffff" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 20, fontSize: 46, fontWeight: 700 }}><div style={{ width: 24, height: 24, borderRadius: 12, background: "#21bb9d" }} />Alymero</div>
    <div style={{ display: "flex", marginTop: 58, maxWidth: 1000, fontSize: 68, fontWeight: 700, lineHeight: 1.1 }}>Votre gestion commerciale, parfaitement orchestrée.</div>
    <div style={{ display: "flex", marginTop: 38, fontSize: 30, color: "#9ee4d3" }}>CRM · Devis · Factures · Projets</div>
    <div style={{ display: "flex", marginTop: "auto", justifyContent: "space-between", fontSize: 23, color: "#b7c8d4" }}><span>Indépendants, agences et PME</span><span>alymero.com</span></div>
  </div>, size);
}
