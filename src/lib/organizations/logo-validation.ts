export const MAX_ORGANIZATION_LOGO_SIZE = 2 * 1024 * 1024;

const LOGO_SIGNATURES = [
  {
    mimeType: "image/png",
    extension: "png",
    matches: (bytes: Uint8Array) =>
      bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value),
  },
  {
    mimeType: "image/jpeg",
    extension: "jpg",
    matches: (bytes: Uint8Array) =>
      bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  },
] as const;

export class InvalidOrganizationLogoError extends Error {}

export function inspectOrganizationLogo(bytes: Uint8Array) {
  if (bytes.length === 0) throw new InvalidOrganizationLogoError("Le fichier est vide.");
  if (bytes.length > MAX_ORGANIZATION_LOGO_SIZE) {
    throw new InvalidOrganizationLogoError("Le logo dépasse la limite de 2 Mo.");
  }
  const detected = LOGO_SIGNATURES.find((signature) => signature.matches(bytes));
  if (!detected) {
    throw new InvalidOrganizationLogoError("Utilisez une image PNG ou JPEG valide.");
  }
  return detected;
}

export function organizationLogoContentType(storageKey: string): string {
  return storageKey.endsWith(".png") ? "image/png" : "image/jpeg";
}
