import { describe, expect, it } from "vitest";
import { validateServerEnvironment } from "./server";

const valid = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:password@db:5432/alymero",
  APP_URL: "https://app.example.com",
  BETTER_AUTH_URL: "https://app.example.com",
  BETTER_AUTH_SECRET: "a-secure-secret-with-more-than-32-characters",
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  SMTP_USER: "smtp-user",
  SMTP_PASSWORD: "smtp-password",
  EMAIL_FROM: "Alymero <contact@example.com>",
  STORAGE_DRIVER: "local",
  PRIVATE_UPLOAD_DIR: "/app/uploads",
} as NodeJS.ProcessEnv;

describe("configuration serveur", () => {
  it("accepte une configuration de production complète", () => {
    expect(() => validateServerEnvironment(valid)).not.toThrow();
  });

  it("refuse HTTP en production", () => {
    expect(() => validateServerEnvironment({ ...valid, APP_URL: "http://example.com" })).toThrow(
      /HTTPS/,
    );
  });

  it("refuse les secrets et adresses d'exemple", () => {
    expect(() =>
      validateServerEnvironment({
        ...valid,
        BETTER_AUTH_SECRET: "remplacer-par-un-secret-aleatoire-de-32-octets",
      }),
    ).toThrow(/exemple/);
  });

  it("refuse un transport SMTP anonyme en production", () => {
    expect(() =>
      validateServerEnvironment({ ...valid, SMTP_USER: "", SMTP_PASSWORD: "" }),
    ).toThrow(/SMTP_USER/);
  });

  it("accepte un stockage S3 complètement configuré", () => {
    expect(() =>
      validateServerEnvironment({
        ...valid,
        STORAGE_DRIVER: "s3",
        S3_ENDPOINT: "https://project.storage.supabase.co/storage/v1/s3",
        S3_REGION: "eu-west-1",
        S3_BUCKET: "alymero-private",
        S3_ACCESS_KEY_ID: "access-key",
        S3_SECRET_ACCESS_KEY: "secret-key",
      }),
    ).not.toThrow();
  });

  it("refuse un stockage S3 incomplet en production", () => {
    expect(() =>
      validateServerEnvironment({ ...valid, STORAGE_DRIVER: "s3" }),
    ).toThrow(/Configuration S3 incomplète/);
  });
});
