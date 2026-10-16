import "server-only";
import nodemailer, { type Transporter } from "nodemailer";

/**
 * Transport e-mail applicatif.
 * En développement, pointe vers Mailpit (SMTP localhost:1025) : les e-mails
 * sont capturés et visibles sur http://localhost:8025, sans envoi réel.
 * En production, renseigner un vrai fournisseur SMTP via les variables d'env.
 *
 * Le transport est créé paresseusement (au premier envoi) pour ne pas ouvrir
 * de connexion au simple import du module.
 */
let transporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (transporter) return transporter;

  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? "1025");

  if (!host) {
    throw new Error(
      "SMTP_HOST manquant. Configurez le transport e-mail (voir .env.example).",
    );
  }

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASSWORD;

  transporter = nodemailer.createTransport({
    host,
    port,
    secure: process.env.SMTP_SECURE === "true",
    auth: user && pass ? { user, pass } : undefined,
    pool: true,
    maxConnections: 3,
    maxMessages: 50,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
  });

  return transporter;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
  replyTo?: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "Alymero <no-reply@alymero.test>";
  const recipientDomain = input.to.split("@")[1]?.toLowerCase() ?? "unknown";
  for (let attempt = 1; attempt <= 3; attempt += 1) {
    try {
      const result = await getTransporter().sendMail({
        from,
        to: input.to,
        subject: input.subject,
        html: input.html,
        text: input.text,
        attachments: input.attachments,
        replyTo: input.replyTo,
      });
      console.info("email.accepted", { recipientDomain, messageId: result.messageId, attempt });
      return;
    } catch (error) {
      const retry = attempt < 3 && isTransientEmailError(error);
      console.warn("email.delivery_attempt_failed", {
        recipientDomain,
        attempt,
        retry,
        code: emailErrorCode(error),
      });
      if (!retry) throw error;
      transporter?.close();
      transporter = null;
      await new Promise((resolve) => setTimeout(resolve, attempt * 500));
    }
  }
}

function emailErrorCode(error: unknown) {
  const details = error as { code?: string; responseCode?: number } | null;
  return details?.code ?? details?.responseCode ?? "unknown";
}

export function isTransientEmailError(error: unknown): boolean {
  const details = error as { code?: string; responseCode?: number } | null;
  return ["ETIMEDOUT", "ECONNECTION", "ECONNRESET", "ECONNREFUSED", "ENETUNREACH"].includes(details?.code ?? "")
    || [421, 450, 451, 452].includes(details?.responseCode ?? 0);
}

export function emailDeliveryErrorMessage(error: unknown): string {
  const details = error as { code?: string; responseCode?: number; command?: string } | null;
  if (details?.code === "EAUTH" || details?.responseCode === 535) {
    return "Le service d’envoi d’e-mails a refusé la connexion. Vérifiez les identifiants SMTP dans l’environnement de production.";
  }
  if (["ETIMEDOUT", "ECONNECTION", "ECONNREFUSED", "ENETUNREACH"].includes(details?.code ?? "")) {
    return "Le service d’envoi d’e-mails est momentanément inaccessible. Vérifiez la configuration SMTP puis réessayez.";
  }
  if (details?.responseCode === 550 || details?.command === "MAIL FROM") {
    return "L’adresse d’expédition n’est pas autorisée. Vérifiez qu’elle utilise une adresse ou un domaine authentifié.";
  }
  return "L’e-mail n’a pas pu être envoyé. Vérifiez la configuration SMTP puis réessayez.";
}
