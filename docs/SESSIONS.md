# Déconnexion après cinq minutes d’inactivité

La limite est fixée à 300 secondes pour toutes les sessions connectées, y compris
les administrateurs et les sessions de support. « Se souvenir de moi » ne la
désactive pas : cela concerne uniquement la persistance du cookie.

## Fonctionnement

- Better Auth émet une session de cinq minutes. Le renouvellement automatique sur
  les lectures est désactivé et le cache de session dans les cookies est désactivé.
- Le navigateur observe les interactions clavier, pointeur, tactile et défilement.
  Les requêtes automatiques, les animations et le retour sur un onglet ne remettent
  pas le délai à zéro.
- Seule une activité récente déclenche `POST /api/auth/session/activity`.
  Les envois sont regroupés sur 15 secondes et transmettent le temps écoulé depuis
  l’interaction, pour ne pas prolonger le délai à cause du regroupement.
- L’endpoint renouvelle un cookie signé et la date d’expiration en base uniquement
  si la session est encore valide et le compte non suspendu. Une session expirée
  ne peut pas être réactivée par cet endpoint.
- Les onglets partageant la même session synchronisent leur activité. Un rechargement
  de page ne repart pas systématiquement pour cinq nouvelles minutes.
- À l’expiration, l’interface est masquée, la déconnexion est demandée et le navigateur
  revient à la connexion. Si le navigateur est suspendu ou fermé, l’expiration reste
  appliquée côté serveur.

## Déploiement

Appliquer la migration `20261017120000_cap_existing_idle_sessions` avant ou avec le
déploiement du code : elle plafonne également les anciennes sessions à cinq
minutes supplémentaires, sans prolonger celles déjà expirées.

```sh
npx prisma migrate deploy
```

Le script `hostinger:build` applique déjà les migrations. Ne pas exécuter les tests
d’intégration sur une base de production.

## Vérification

Les tests HTTP de Better Auth couvrent la limite de cinq minutes, l’absence de
renouvellement lors des lectures, le renouvellement sur activité, le rejet des
sessions expirées/suspendues, les requêtes d’une autre origine et les requêtes
retardées d’un autre onglet.

```sh
npx vitest run src/lib/security/idle-session.test.ts src/server/auth/idle-session.test.ts
```
