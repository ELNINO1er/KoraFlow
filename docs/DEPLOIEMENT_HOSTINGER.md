# Déploiement Alymero sur Hostinger

Cette cible utilise l'hébergement Node.js managé de Hostinger, une base PostgreSQL
Supabase et un stockage privé Supabase compatible S3. Aucun VPS n'est requis.

## Paramètres de compilation

- Cadre : `Next.js`
- Branche : `main`
- Node.js : `24.x`
- Répertoire racine : `./`
- Commande de compilation : `npm run hostinger:build`
- Commande de démarrage : `npm run start`

La commande Hostinger applique les migrations Prisma avant de compiler. Les
migrations doivent donc rester rétrocompatibles avec la version encore en ligne.

## Services externes requis

1. Créer un projet Supabase dans une région raisonnablement proche des utilisateurs.
2. Utiliser l'URL PostgreSQL avec pool de connexions pour `DATABASE_URL`.
3. Créer un bucket privé `alymero-private`.
4. Activer le protocole S3 Supabase et générer une paire de clés réservée au serveur.
5. Authentifier `alymero.com` dans Brevo, puis créer une clé SMTP.

Les clés Supabase S3 donnent accès à tous les objets du stockage : elles restent
exclusivement dans les variables d'environnement Hostinger et ne doivent jamais
être copiées dans GitHub ou dans le navigateur de l'application.

## Variables Hostinger

Les valeurs suivantes ne sont pas secrètes :

```dotenv
NODE_ENV=production
APP_URL=https://alymero.com
BETTER_AUTH_URL=https://alymero.com
DEFAULT_LOCALE=fr
DEFAULT_CURRENCY=XOF
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_FROM=Alymero <no-reply@alymero.com>
STORAGE_DRIVER=s3
PRIVATE_UPLOAD_DIR=/tmp/alymero-unused
S3_BUCKET=alymero-private
```

Les valeurs suivantes sont des secrets à saisir uniquement dans Hostinger :

- `DATABASE_URL`
- `BETTER_AUTH_SECRET` (au moins 32 octets aléatoires)
- `SMTP_USER`
- `SMTP_PASSWORD`
- `S3_ENDPOINT`
- `S3_REGION`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`

## Contrôles après déploiement

1. Vérifier `/api/health` en HTTPS.
2. Créer un compte avec une adresse de test et confirmer l'e-mail reçu.
3. Vérifier connexion, déconnexion et récupération du mot de passe.
4. Envoyer puis télécharger un document privé autorisé.
5. Vérifier qu'un utilisateur d'une autre organisation reçoit un refus.
6. Contrôler les journaux Hostinger sans y faire apparaître de secret.
