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
  EMAIL_FROM: z.string().min(3),
  STORAGE_DRIVER: z.literal("local").default("local"),
  PRIVATE_UPLOAD_DIR: z.string().min(1).default(".data/uploads"),
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
      result.data.EMAIL_FROM.endsWith("@koraflow.test>")
    ) {
      throw new Error("Les valeurs d’exemple ne sont pas autorisées en production.");
    }
  }
}
