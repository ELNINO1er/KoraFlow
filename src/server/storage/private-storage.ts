import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mkdir, readFile, readdir, rm, stat, writeFile } from "node:fs/promises";
import path from "node:path";

export class StorageConfigurationError extends Error {}

let s3Client: S3Client | null = null;

function requiredEnvironment(name: string): string {
  const value = process.env[name];
  if (!value) throw new StorageConfigurationError(`${name} est requis pour le stockage S3.`);
  return value;
}

function getS3Configuration() {
  return {
    endpoint: requiredEnvironment("S3_ENDPOINT"),
    region: requiredEnvironment("S3_REGION"),
    bucket: requiredEnvironment("S3_BUCKET"),
    accessKeyId: requiredEnvironment("S3_ACCESS_KEY_ID"),
    secretAccessKey: requiredEnvironment("S3_SECRET_ACCESS_KEY"),
  };
}

function getS3Client(): { client: S3Client; bucket: string } {
  const configuration = getS3Configuration();
  s3Client ??= new S3Client({
    endpoint: configuration.endpoint,
    region: configuration.region,
    forcePathStyle: true,
    credentials: {
      accessKeyId: configuration.accessKeyId,
      secretAccessKey: configuration.secretAccessKey,
    },
  });
  return { client: s3Client, bucket: configuration.bucket };
}

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
  validateStorageKey(key);
  const root = storageRoot();
  const target = path.resolve(/* turbopackIgnore: true */ root, key);
  if (!target.startsWith(`${root}${path.sep}`)) throw new Error("Clé de stockage invalide.");
  return target;
}

function validateStorageKey(key: string): void {
  if (!/^[a-zA-Z0-9/_-]+\.[a-z0-9]+$/.test(key) || key.includes("..")) {
    throw new Error("Clé de stockage invalide.");
  }
}

export async function putPrivateFile(key: string, bytes: Uint8Array): Promise<void> {
  if (process.env.STORAGE_DRIVER === "s3") {
    validateStorageKey(key);
    const { client, bucket } = getS3Client();
    await client.send(
      new PutObjectCommand({ Bucket: bucket, Key: key, Body: bytes, IfNoneMatch: "*" }),
    );
    return;
  }
  const target = resolveStorageKey(key);
  await mkdir(path.dirname(target), { recursive: true });
  await writeFile(target, bytes, { flag: "wx", mode: 0o600 });
}

export async function getPrivateFile(key: string): Promise<Buffer> {
  if (process.env.STORAGE_DRIVER === "s3") {
    validateStorageKey(key);
    const { client, bucket } = getS3Client();
    const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    if (!response.Body) throw new Error("Document introuvable dans le stockage privé.");
    return Buffer.from(await response.Body.transformToByteArray());
  }
  return readFile(resolveStorageKey(key));
}

/**
 * Liste les clés présentes sous un préfixe (pour la purge des fichiers
 * temporaires). Préfixe validé comme un sous-dossier simple.
 */
export async function listPrivateFiles(prefix: string): Promise<string[]> {
  if (!/^[a-zA-Z0-9/_-]+$/.test(prefix) || prefix.includes("..")) {
    throw new Error("Préfixe de stockage invalide.");
  }
  if (process.env.STORAGE_DRIVER === "s3") {
    const { client, bucket } = getS3Client();
    const keys: string[] = [];
    let token: string | undefined;
    do {
      const res = await client.send(
        new ListObjectsV2Command({ Bucket: bucket, Prefix: prefix, ContinuationToken: token }),
      );
      for (const obj of res.Contents ?? []) if (obj.Key) keys.push(obj.Key);
      token = res.IsTruncated ? res.NextContinuationToken : undefined;
    } while (token);
    return keys;
  }
  const root = storageRoot();
  const base = path.resolve(/* turbopackIgnore: true */ root, prefix);
  const out: string[] = [];
  async function walk(dir: string) {
    let names: string[];
    try {
      names = await readdir(dir);
    } catch {
      return;
    }
    for (const name of names) {
      const full = path.join(dir, name);
      let isDir = false;
      try {
        isDir = (await stat(full)).isDirectory();
      } catch {
        continue;
      }
      if (isDir) await walk(full);
      else out.push(path.relative(root, full).split(path.sep).join("/"));
    }
  }
  await walk(base);
  return out;
}

export async function deletePrivateFile(key: string): Promise<void> {
  if (process.env.STORAGE_DRIVER === "s3") {
    validateStorageKey(key);
    const { client, bucket } = getS3Client();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return;
  }
  await rm(resolveStorageKey(key), { force: true });
}
