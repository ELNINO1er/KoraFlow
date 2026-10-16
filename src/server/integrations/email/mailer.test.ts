import { describe, expect, it } from "vitest";
import { emailDeliveryErrorMessage, isTransientEmailError } from "./mailer";

describe("gestion des erreurs de livraison e-mail", () => {
  it("réessaie les pannes réseau et réponses SMTP temporaires", () => {
    expect(isTransientEmailError({ code: "ETIMEDOUT" })).toBe(true);
    expect(isTransientEmailError({ responseCode: 451 })).toBe(true);
  });

  it("ne réessaie pas une authentification refusée", () => {
    expect(isTransientEmailError({ code: "EAUTH", responseCode: 535 })).toBe(false);
    expect(emailDeliveryErrorMessage({ code: "EAUTH" })).not.toContain("Brevo");
  });
});
