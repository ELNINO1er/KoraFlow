import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { twoFactor } from "better-auth/plugins";
import { admin } from "better-auth/plugins/admin";
import { nextCookies } from "better-auth/next-js";
import { prisma } from "../database/client";

/**
 * Instance serveur Better Auth (source de vérité de l'authentification).
 *
 * Périmètre : e-mail/mot de passe, vérification d'e-mail, réinitialisation de
 * mot de passe, sessions, MFA (TOTP via le plugin twoFactor).
 * Les secrets et l'URL de base sont lus depuis l'environnement
 * (BETTER_AUTH_SECRET, BETTER_AUTH_URL).
 *
 * NB : les organisations/membres ne sont PAS gérés par Better Auth ici — c'est
 * notre couche métier (Sprint 1.4) qui s'en charge sur nos tables Prisma.
 */
export const auth = betterAuth({
  appName: "KoraFlow",
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
    sendResetPassword: async ({ user, url }) => {
      const { sendEmail } = await import("../integrations/email/mailer");
      await sendEmail({
        to: user.email,
        subject: "Réinitialisation de votre mot de passe KoraFlow",
        html: `<p>Bonjour,</p>
<p>Vous avez demandé à réinitialiser votre mot de passe KoraFlow.</p>
<p><a href="${url}">Choisir un nouveau mot de passe</a></p>
<p>Si vous n'êtes pas à l'origine de cette demande, ignorez cet e-mail.</p>`,
        text: `Réinitialiser votre mot de passe KoraFlow : ${url}`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      const { sendEmail } = await import("../integrations/email/mailer");
      await sendEmail({
        to: user.email,
        subject: "Confirmez votre adresse e-mail KoraFlow",
        html: `<p>Bienvenue sur KoraFlow,</p>
<p>Confirmez votre adresse e-mail pour activer votre compte :</p>
<p><a href="${url}">Confirmer mon adresse e-mail</a></p>`,
        text: `Confirmez votre adresse e-mail KoraFlow : ${url}`,
      });
    },
  },
  user: {
    changeEmail: {
      enabled: true,
    },
  },
  // twoFactor : MFA (TOTP).
  // admin : administration de plateforme (impersonation, gestion de comptes).
  //   Les admins sont identifiés par le rôle "admin" (synchronisé avec le drapeau
  //   isPlatformAdmin de notre couche métier). Le bannissement du plugin n'est pas
  //   utilisé (suspension gérée via suspendedAt).
  // nextCookies doit rester le DERNIER plugin.
  plugins: [twoFactor(), admin({ adminRoles: ["admin"] }), nextCookies()],
});
