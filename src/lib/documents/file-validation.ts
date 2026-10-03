import { createHash } from "node:crypto";

export const MAX_PRIVATE_FILE_SIZE = 10 * 1024 * 1024;

const SIGNATURES = [
  { mimeType: "application/pdf", extension: "pdf", matches: (b: Uint8Array) => Buffer.from(b.subarray(0, 5)).toString() === "%PDF-" },
  { mimeType: "image/png", extension: "png", matches: (b: Uint8Array) => b.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((v, i) => b[i] === v) },
  { mimeType: "image/jpeg", extension: "jpg", matches: (b: Uint8Array) => b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
] as const;

export class InvalidDocumentError extends Error {
  constructor(public readonly code: "EMPTY" | "TOO_LARGE" | "UNSUPPORTED" | "INVALID_NAME") {
    super(code);
    this.name = "InvalidDocumentError";
  }
}

export function inspectPrivateFile(originalName: string, bytes: Uint8Array) {
  const name = originalName.trim();
  if (!name || name.length > 255 || /[\r\n\0]/.test(name)) {
    throw new InvalidDocumentError("INVALID_NAME");
  }
  if (bytes.length === 0) throw new InvalidDocumentError("EMPTY");
  if (bytes.length > MAX_PRIVATE_FILE_SIZE) throw new InvalidDocumentError("TOO_LARGE");

  const detected = SIGNATURES.find((signature) => signature.matches(bytes));
  if (!detected) throw new InvalidDocumentError("UNSUPPORTED");

  return {
    originalName: name,
    mimeType: detected.mimeType,
    extension: detected.extension,
    sizeBytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex"),
  };
}

export function documentErrorMessage(error: InvalidDocumentError): string {
  switch (error.code) {
    case "EMPTY": return "Le fichier est vide.";
    case "TOO_LARGE": return "Le fichier dépasse la limite de 10 Mo.";
    case "UNSUPPORTED": return "Format refusé. Utilisez un PDF, PNG ou JPEG valide.";
    case "INVALID_NAME": return "Le nom du fichier est invalide.";
  }
}
