import { describe, expect, it } from "vitest";
import { inspectOrganizationLogo, InvalidOrganizationLogoError, MAX_ORGANIZATION_LOGO_SIZE } from "./logo-validation";

describe("validation du logo d’organisation", () => {
  it("accepte une signature PNG valide", () => {
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10, 0]);
    expect(inspectOrganizationLogo(png)).toMatchObject({ mimeType: "image/png", extension: "png" });
  });

  it("refuse un contenu qui ne correspond pas à une image autorisée", () => {
    expect(() => inspectOrganizationLogo(new TextEncoder().encode("<svg></svg>"))).toThrow(InvalidOrganizationLogoError);
  });

  it("refuse un fichier supérieur à 2 Mo", () => {
    expect(() => inspectOrganizationLogo(new Uint8Array(MAX_ORGANIZATION_LOGO_SIZE + 1))).toThrow(/2 Mo/);
  });
});
