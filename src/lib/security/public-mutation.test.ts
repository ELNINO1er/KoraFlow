import { describe, expect, it } from "vitest";
import { guardPublicMutation } from "./public-mutation";

const token = "a".repeat(48);

describe("guardPublicMutation", () => {
  it("refuse un jeton public mal formé", () => {
    const result = guardPublicMutation({
      scope: "quote-response",
      token: "../devis",
      headers: new Headers(),
    });

    expect(result).toEqual({ ok: false, error: "Lien invalide ou expiré." });
  });

  it("bloque au-delà de la limite par IP et jeton", () => {
    const headers = new Headers({ "x-forwarded-for": "203.0.113.8" });
    const uniqueToken = `${Math.random().toString(16).slice(2, 14).padEnd(12, "0")}${token}`.slice(0, 48);

    expect(guardPublicMutation({ scope: "contract-signature", token: uniqueToken, headers, limit: 1 }).ok).toBe(true);
    expect(guardPublicMutation({ scope: "contract-signature", token: uniqueToken, headers, limit: 1 })).toEqual({
      ok: false,
      error: "Trop de tentatives. Réessayez dans un instant.",
    });
  });

  it("borne le user-agent conservé dans la piste d’audit", () => {
    const result = guardPublicMutation({
      scope: "contract-signature",
      token: "b".repeat(48),
      headers: new Headers({ "user-agent": "x".repeat(700) }),
    });

    expect(result.ok).toBe(true);
    if (result.ok) expect(result.userAgent).toHaveLength(512);
  });
});
