# Référencement Google d’Alymero

## Ce qui est préparé dans le projet

- Accueil public toujours accessible, même lorsqu’un utilisateur est connecté.
  Le rendu de cet accueil ne nécessite plus d’interroger sa session en base.
- Titres, descriptions, URL canoniques, image Open Graph et balises de partage.
- Données structurées `Organization`, `WebSite` et fils d’Ariane, sans avis ni
  tarifs inventés.
- Pages publiques :
  - `/solutions/crm-pme`
  - `/solutions/devis-factures`
  - `/solutions/gestion-projets`
  - `/solutions/portail-client`
- Liens internes depuis l’accueil et le pied de page.
- `/sitemap.xml` contenant exclusivement l’accueil et ces quatre pages.
- `/robots.txt` indiquant le sitemap et laissant accessibles les ressources JS/CSS.
- `noindex, nofollow, noarchive` par défaut pour les espaces applicatifs et les
  documents accessibles par lien ; seules les pages commerciales autorisent
  explicitement l’indexation. Les réponses API reçoivent `X-Robots-Tag`.

`noindex` complète les contrôles d’accès, il ne les remplace pas. Les pages HTML
ne sont pas bloquées globalement dans robots.txt, pour que Google puisse lire
leur instruction `noindex`.

Les pages sont rendues à la requête pour rester compatibles avec la CSP à nonce
du projet. Leur contenu commercial est présent dans le HTML serveur.

## Mise en ligne et Search Console

Les modifications locales doivent être déployées avant leur prise en compte par
Google. Le contrôle public effectué le 17 octobre 2026 a constaté que la page
d’accueil répondait en HTTPS avec un statut 200, tandis que `/robots.txt` et
`/sitemap.xml` répondaient encore 404 sur la version alors hébergée.

1. Déployer le projet, puis vérifier que les cinq pages publiques et les deux
   fichiers d’exploration répondent avec un statut 200.
2. Ouvrir [Google Search Console](https://search.google.com/search-console).
3. Ajouter une propriété **Domaine** pour `alymero.com` et placer l’enregistrement
   TXT de validation fourni par Google dans le DNS du domaine. Ne pas inventer
   cette valeur et ne pas modifier les enregistrements de messagerie.
4. Autre possibilité : créer une propriété **Préfixe d’URL** pour
   `https://alymero.com/` et choisir la validation par balise HTML. Renseigner
   uniquement son code dans `GOOGLE_SITE_VERIFICATION`, redéployer et valider.
5. Soumettre `https://alymero.com/sitemap.xml` dans la rubrique **Sitemaps**.
6. Inspecter l’accueil et les pages solutions, puis demander leur indexation.
7. Suivre les rapports d’indexation et de performances : impressions, clics,
   requêtes et pages de destination.

Les accès au compte Google, le code de validation et les accès DNS restent
nécessaires pour ces étapes externes. Aucun sitemap n’a été soumis au nom d’un
compte Google par les modifications du code seules.

La soumission facilite la découverte des pages ; elle ne garantit ni leur
indexation, ni une position particulière. Voir la
[documentation officielle des sitemaps Google](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap).

## Contenu à développer ensuite

Publier des exemples réels d’utilisation, des guides utiles aux indépendants et
PME, ainsi que des réponses aux questions des clients. Éviter les pages dupliquées
par ville ou les promesses de conformité et de paiement automatique non vérifiées.

## Contrôles techniques

```sh
npm run typecheck
npm run lint
npx vitest run src/lib/seo/site.test.ts
npm run build -- --webpack
```

Vérifier le titre, la description, la balise canonique et `index, follow` sur les
pages commerciales ; vérifier `noindex` sur `/login`, `/admin` et les liens de
documents. Ne pas inclure de données client dans le sitemap ou les données
structurées.
