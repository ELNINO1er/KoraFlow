import "server-only";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export class StorageConfigurationError extends Error {}

function storageRoot(): string {
  const driver = process.env.STORAGE_DRIVER ?? "local";
  if (driver !== "local") {
    throw new StorageConfigurationError(`Pilote de stockage non pris en charge : ${driver}`);
  }

  const configured = process.env.PRIVATE_UPLOAD_DIR;
  if (process.env.NODE_ENV === "production" && !configured) {
    throw new StorageConfigurationError(
      "PRIVATE_UPLOAD_DIR doit pointer vers un volume persistant en production.",
    );
  }
  return path.resolve(
    /* turbopackIgnore: true */ process.cwd(),
    configured || ".data/uploads",
  );
}

function resolveStorageKey(key: string): string {
  if (!/^[a-zA-Z0-9/_-]+\.[a-z0-9]+$/.test(key)) {
    throw new Error("Clé de stockage invalide.");
  }
  const root = storageRoot();
  const target = path.resolve(/* turbopackIgnore: true */ root, key);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Clé de stockage invalide.");
  return target;
}

export async function putPrivateFile(key: string, bytes: Uint8Array): Promise<void> {
  const target = resolveStorageKey(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes, { flag: "wx", mode: 0o600 });
}

export function getPrivateFile(key: string): Promise<Buffer> {
  return readFile(resolveStorageKey(key));
}

export async function deletePrivateFile(key: string): Promise<void> {
  await rm(resolveStorageKey(key), { force: true });
}
