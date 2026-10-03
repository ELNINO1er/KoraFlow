import { describe, expect, it } from "vitest";
import { validateServerEnvironment } from "./server";

const valid = {
  NODE_ENV: "production",
  DATABASE_URL: "postgresql://user:password@db:5432/koraflow",
  APP_URL: "https://app.example.com",
  BETTER_AUTH_URL: "https://app.example.com",
  BETTER_AUTH_SECRET: "a-secure-secret-with-more-than-32-characters",
  SMTP_HOST: "smtp.example.com",
  SMTP_PORT: "587",
  SMTP_SECURE: "false",
  EMAIL_FROM: "KoraFlow <contact@example.com>",
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
});
