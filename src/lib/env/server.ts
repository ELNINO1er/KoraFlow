import { z } from "zod";

const serverEnvironmentSchema = z.object({
  DATABASE_URL: z.string().min(1).refine(
    (value) => value.startsWith("postgresql://") || value.startsWith("postgres://"),
    "DATABASE_URL doit être une URL PostgreSQL.",
  ),
  APP_URL: z.url(),
  BETTER_AUTH_URL: z.url(),
  BETTER_AUTH_SECRET: z.string().min(32),
  SMTP_HOST: z.string().min(1),
  SMTP_PORT: z.coerce.number().int().min(1).max(65535),
  SMTP_SECURE: z.enum(["true", "false"]),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASSWORD: z.string().min(1).optional(),
  EMAIL_FROM: z.string().min(3),
  STORAGE_DRIVER: z.enum(["local", "s3"]).default("local"),
  PRIVATE_UPLOAD_DIR: z.string().min(1).default(".data/uploads"),
  S3_ENDPOINT: z.url().optional(),
  S3_REGION: z.string().min(1).optional(),
  S3_BUCKET: z.string().min(1).optional(),
  S3_ACCESS_KEY_ID: z.string().min(1).optional(),
  S3_SECRET_ACCESS_KEY: z.string().min(1).optional(),
});

export function validateServerEnvironment(environment: NodeJS.ProcessEnv = process.env): void {
  const result = serverEnvironmentSchema.safeParse(environment);
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new Error(`Configuration serveur invalide — ${details}`);
  }

  if (environment.NODE_ENV === "production") {
    const appUrl = new URL(result.data.APP_URL);
    const authUrl = new URL(result.data.BETTER_AUTH_URL);
    if (appUrl.protocol !== "https:" || authUrl.protocol !== "https:") {
      throw new Error("APP_URL et BETTER_AUTH_URL doivent utiliser HTTPS en production.");
    }
    if (
      result.data.BETTER_AUTH_SECRET.includes("remplacer") ||
      result.data.EMAIL_FROM.endsWith("@alymero.test>")
    ) {
      throw new Error("Les valeurs d’exemple ne sont pas autorisées en production.");
    }

    if (!result.data.SMTP_USER || !result.data.SMTP_PASSWORD) {
      throw new Error("SMTP_USER et SMTP_PASSWORD sont requis en production.");
    }

    if (result.data.STORAGE_DRIVER === "s3") {
      const missing = [
        "S3_ENDPOINT",
        "S3_REGION",
        "S3_BUCKET",
        "S3_ACCESS_KEY_ID",
        "S3_SECRET_ACCESS_KEY",
      ].filter((key) => !environment[key]);
      if (missing.length > 0) {
        throw new Error(`Configuration S3 incomplète — ${missing.join(", ")}`);
      }
    }
  }
}
