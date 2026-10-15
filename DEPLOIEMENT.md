# Déploiement Alymero — to-do list

Socle déjà prêt dans le dépôt : `Dockerfile` (multi-stage, non-root, healthcheck,
cible `migrator`), `docker-compose.prod.yml` (postgres + migrate + app), `.env.production.example`,
CI qui build l'image. Il reste surtout à **fournir l'infra, les secrets et un reverse proxy HTTPS**.

> L'app écoute sur `127.0.0.1:3000` (volontairement non exposée) → un **reverse proxy** (Caddy/Nginx) gère le HTTPS devant.

---

## 1. Prérequis (à réunir)
- [ ] **Serveur** Linux (VPS) avec **Docker** + **Docker Compose v2** (ex. Hetzner, OVH, DigitalOcean, Scaleway).
- [x] **Nom de domaine** : `alymero.com` acheté et actif chez le registrar.
- [ ] Ajouter les enregistrements DNS demandés par l’hébergeur une fois le serveur choisi.
- [ ] **Fournisseur SMTP réel** pour les e-mails (vérification, invitations, reset, notifications) :
      ex. **Brevo (Sendinblue)**, **Resend**, **Mailgun**, **Amazon SES**, **Postmark**.
      → récupérer `SMTP_HOST / PORT / USER / PASSWORD` et une adresse d'expéditeur vérifiée.
- [ ] (Recommandé) un **stockage de sauvegarde** externe (S3, Backblaze B2, espace objet…).

## 2. Préparer le serveur
- [ ] Créer un utilisateur non-root + clés SSH ; désactiver le login par mot de passe.
- [ ] **Pare-feu** : ouvrir uniquement **22 (SSH)**, **80**, **443**. Ne PAS exposer PostgreSQL.
- [ ] Installer Docker + Docker Compose.
- [ ] Récupérer le code sur le serveur (`git clone` du dépôt).

## 3. Configurer les secrets (`.env.production`)
- [ ] `cp .env.production.example .env.production`
- [ ] Générer et renseigner :
  - [ ] `POSTGRES_PASSWORD` = mot de passe long aléatoire **et** reporter la même valeur dans `DATABASE_URL`.
  - [ ] `BETTER_AUTH_SECRET` = secret aléatoire ≥ 32 octets.
  - [ ] `APP_URL` **et** `BETTER_AUTH_URL` = `https://votre-domaine`.
  - [ ] `SMTP_HOST/PORT/SECURE/USER/PASSWORD` + `EMAIL_FROM` (du fournisseur choisi).
  - Générer un secret : `openssl rand -base64 32` (ou `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`).
- [ ] Vérifier que `.env.production` **n'est pas** committé (il est ignoré par git).

## 4. Déployer (build + migrations + app)
- [ ] Lancer :
      ```bash
      docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
      ```
      (le service `migrate` applique automatiquement les migrations avant que `app` démarre.)
- [ ] Vérifier la santé : `curl -s http://127.0.0.1:3000/api/health` → `{"status":"ok","db":"up"}`.
- [ ] `docker compose -f docker-compose.prod.yml ps` → `postgres` et `app` « healthy », `migrate` « exited (0) ».

## 5. HTTPS (reverse proxy)
- [ ] Installer un reverse proxy. **Caddy** = le plus simple (HTTPS auto via Let's Encrypt) :
      ```
      votre-domaine {
        reverse_proxy 127.0.0.1:3000
      }
      ```
      (Alternatives : Nginx + Certbot, ou Traefik.)
- [ ] Vérifier `https://votre-domaine/api/health` depuis l'extérieur.

## 6. Premier compte & super-admin
- [ ] Créer le premier compte via `https://votre-domaine/register` → **confirmer l'e-mail** (lien reçu, cette fois en réel).
- [ ] Créer l'organisation.
- [ ] Se promouvoir **super-admin** :
      ```bash
      docker compose -f docker-compose.prod.yml exec app node_modules/.bin/tsx scripts/grant-platform-admin.ts votre-email@domaine
      ```
      (ou via la console `/admin` si un autre admin existe déjà.)

## 7. Exploitation (avant une vraie mise en service)
- [ ] **Sauvegardes automatiques** PostgreSQL (`pg_dump` en cron → stockage externe) **et tester une restauration**.
- [ ] **Sauvegarde du volume `uploads`** (documents privés de projet + avatars).
- [ ] **Supervision** : uptime (ex. UptimeRobot sur `/api/health`), logs, éventuellement **Sentry** pour les erreurs.
- [ ] Mettre à jour régulièrement l'hôte + les images Docker.
- [ ] (Multi-instance plus tard) passer le **rate-limit en mémoire → Redis** et externaliser le stockage (S3).

## 8. Points produit / juridique à trancher
- [x] Nom de produit retenu : **Alymero** ; domaine `alymero.com` acheté.
- [ ] Vérifier la disponibilité juridique de la marque Alymero (notamment OAPI) avant lancement commercial.
- [ ] Rédiger **CGU**, **Politique de confidentialité**, mentions légales (référencées dans le footer).
- [ ] **Paiements** : au lancement, la **validation manuelle** suffit ; planifier l'intégration Mobile Money réelle (CinetPay/Wave/OM) ensuite.
- [ ] **FNE** (facture normalisée Côte d'Ivoire) : ne pas présenter les factures comme conformes sans intégration officielle.
- [ ] Vérifier que la **signature** n'est jamais présentée comme « qualifiée » au sens juridique.

---

### Résumé minimal pour « juste mettre en ligne »
1. VPS + Docker + domaine (DNS).  2. Fournisseur SMTP.  3. Remplir `.env.production`.
4. `docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build`.
5. Caddy devant pour le HTTPS.  6. `/register` → super-admin via `admin:grant`.
