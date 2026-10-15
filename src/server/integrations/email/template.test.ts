import { describe, expect, it } from "vitest";
import { brandedEmail } from "./template";

describe("modèle d’e-mail Alymero", () => {
  it("échappe les contenus dynamiques et conserve le lien d’action", () => {
    const html = brandedEmail({
      brandName: "Agence <Démo>",
      title: "Rendez-vous & confirmation",
      body: '<img src=x onerror="alert(1)">',
      action: { label: "Ouvrir", url: "https://alymero.com/q/demo" },
    });

    expect(html).toContain("Agence &lt;Démo&gt;");
    expect(html).toContain("Rendez-vous &amp; confirmation");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).not.toContain('<img src=x onerror="alert(1)">');
    expect(html).toContain('href="https://alymero.com/q/demo"');
  });
});
