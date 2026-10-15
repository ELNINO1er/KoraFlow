import "server-only";
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
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

export async function deletePrivateFile(key: string): Promise<void> {
  if (process.env.STORAGE_DRIVER === "s3") {
    validateStorageKey(key);
    const { client, bucket } = getS3Client();
    await client.send(new DeleteObjectCommand({ Bucket: bucket, Key: key }));
    return;
  }
  await rm(resolveStorageKey(key), { force: true });
}
