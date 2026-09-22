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
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const from = process.env.EMAIL_FROM ?? "KoraFlow <no-reply@koraflow.test>";
  await getTransporter().sendMail({
    from,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    attachments: input.attachments,
  });
}
