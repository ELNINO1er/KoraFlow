# Vérification du rapport Claude — 18 octobre 2026

## Périmètre et conclusion

Analyse du code local à la version `7b7c796`, comparée au texte fourni. Aucun code applicatif ni réglage de production n’a été modifié pour cette vérification. Les références ci-dessous sont des chemins du dépôt.

Le rapport décrit correctement une grande partie du fonctionnement. Il mélange cependant des défauts avérés, des fonctionnalités encore absentes, des choix de produit et des risques conditionnels. Certaines conclusions sont incorrectes, et plusieurs protections de la signature sont moins solides que le rapport ne le laisse entendre.

Les scénarios de concurrence exposés ci-dessous sont déduits des lectures et écritures du code. Ils n’ont pas été reproduits sur des documents réels ou en production. Cette vérification technique ne constitue pas une validation juridique ou fiscale.

## 1. Contrats : constats confirmés

### Fonctionnement général

Les modèles `Contract`, `ContractTemplate` et `SignatureEvent`, les statuts, le numéro annuel par organisation et le jeton aléatoire sont correctement décrits. Le contrat est créé depuis un devis accepté. Le texte est substitué au moment de la création et enregistré en base.

Les brouillons sont éditables ; la signature publique exige le statut `SENT`. Une simple transition administrative vers `SIGNED` est refusée. `markContractSigned` utilise une mise à jour conditionnelle, ce qui évite normalement deux signatures simultanées du même état envoyé.

Références : `prisma/schema.prisma:530`, `src/server/services/contract-service.ts:92`, `src/server/repositories/contract-repository.ts:158`.

### Identification du signataire

Le formulaire demande un nom et une case à cocher. Aucun OTP ni contrôle d’identité n’est intégré. L’adresse enregistrée comme `signerEmail` est celle de la fiche contact ; elle n’est pas confirmée par la personne qui signe.

Concrètement, une personne qui reçoit ou récupère le lien peut saisir un autre nom. Le dossier indique alors l’adresse du contact, sans démontrer que cette boîte mail était contrôlée par le signataire au moment de l’opération.

L’envoi initial du lien à cette adresse apporte un contexte utile, mais n’empêche pas son transfert. Un OTP améliorerait la preuve de contrôle de la boîte mail ; il ne suffirait pas, à lui seul, à vérifier l’identité civile de la personne.

Référence : `src/server/services/contract-service.ts:215`.

### Empreinte, audit et conservation

SHA-256 est bien calculé sur `contract.content`. Ce n’est pas une empreinte du PDF complet : le titre, le logo, les coordonnées affichées et les autres métadonnées du PDF ne sont pas couverts par cette empreinte du texte.

Le PDF est régénéré avec les données actuelles du contact et de l’organisation. Deux téléchargements peuvent donc différer si le logo ou la fiche client change. Aucun fichier PDF signé de référence n’est archivé par ce parcours. Le certificat visible est un encadré généré dans le document, sans mécanisme de signature cryptographique du PDF dans ce code.

L’heure est celle du serveur. Les événements de consentement, l’écriture de signature, l’audit et la notification ne sont pas réunis dans une transaction unique. Une panne peut donc laisser une signature enregistrée sans tout son journal, ou une erreur remontée au client après l’enregistrement effectif de la signature.

Références : `src/server/services/contract-service.ts:203`, `src/server/services/contract-pdf.ts:60`, `src/server/pdf/render-contract.ts:108`.

### Autres limites confirmées

- Modèles réutilisables : schéma et paramètres présents, mais aucun parcours de création/sélection des modèles trouvé. Le modèle intégré est celui utilisé par l’action actuelle.
- Variables : cinq valeurs sont fournies ; une variable inconnue devient silencieusement une chaîne vide.
- Historique : l’édition écrase le texte, sans révisions conservées.
- Consultation : aucun événement `VIEWED` de contrat n’est émis dans le parcours étudié.
- Liens : pas d’expiration ni de rotation du jeton à la correction. Le même lien donne encore accès au texte/PDF du brouillon ou du contrat annulé ; la signature est, elle, refusée hors `SENT`.
- PDF public : pas de validation de format du jeton ni de limite applicative de génération, contrairement aux routes PDF devis/facture. L’accès nécessite néanmoins le jeton secret aléatoire : ce n’est pas une publication de tous les contrats sans contrôle.
- Génération : plusieurs contrats peuvent être créés depuis le même devis ; le numéro du devis n’est pas affiché comme lien inverse dans la fiche contrat.
- Validation : les bornes de contenu de l’édition ne sont pas partagées avec la génération depuis un modèle. Le modèle intégré actuel contient néanmoins un texte suffisant ; aucun défaut de contenu vide n’a été démontré par le parcours actuel.

Références : `src/lib/contracts/render.ts:6`, `src/features/contracts/actions.ts:27`, `src/app/api/c/[token]/pdf/route.ts:4`, `src/server/repositories/contract-repository.ts:136`.

## 2. Contrats : problèmes importants insuffisamment décrits

### Consentement contrôlé seulement dans le navigateur

La case est vérifiée dans `SignForm`, mais l’action serveur reçoit seulement `token` et `signerName`. Elle ne reçoit ni ne valide un consentement explicite. Le service écrit pourtant un événement `CONSENT`.

Une invocation directe de cette action avec un jeton valide peut donc enregistrer ce consentement sans avoir coché la case. Il faut transmettre et exiger le consentement côté serveur, avec la version du texte accepté.

Références : `src/features/contracts/sign-form.tsx:22`, `src/features/contracts/public-actions.ts:16`, `src/server/services/contract-service.ts:206`.

### Version lue différente de la version signée

Scénario possible : le client ouvre le texte A ; l’équipe corrige puis renvoie le texte B ; le client signe depuis son ancien onglet. Comme le jeton reste le même et que l’action n’envoie aucune révision attendue, le serveur peut enregistrer la signature du texte B, que le client n’a pas affiché dans cet onglet.

Une transaction seule ne résout pas ce problème. La signature doit vérifier une révision ou une empreinte transmise depuis la page consultée, et refuser si le document a changé.

Références : `src/features/contracts/public-actions.ts:16`, `src/server/services/contract-service.ts:192`.

### Correction concurrente pouvant rouvrir un contrat signé

La correction lit le statut `SENT`, puis écrit `DRAFT` au moyen d’une fonction qui ne vérifie pas que le statut est toujours `SENT` au moment de l’écriture.

Si une signature arrive entre ces deux opérations, la correction peut remettre le contrat signé en brouillon, lequel devient alors éditable. Le même type de problème concerne les transitions de statut reposant sur une lecture suivie d’une écriture inconditionnelle.

Il faut des transitions conditionnelles atomiques et une stratégie cohérente pour les révisions et preuves de signature.

Références : `src/server/services/contract-service.ts:70`, `src/server/repositories/contract-repository.ts:100`, `src/server/repositories/contract-repository.ts:113`.

## 3. Devis et factures : confirmation et nuances

| Affirmation du rapport | Verdict et explication |
| --- | --- |
| Plusieurs factures peuvent être créées depuis un devis | Confirmé. L’appel de génération ne recherche pas de facture existante et aucune unicité sur `quoteId` ne l’impose. Il faut définir si plusieurs factures sont légitimes, puis garantir l’idempotence du parcours. Un simple contrôle avant création peut encore échouer en concurrence. |
| Il faut nécessairement un statut `INVOICED` du devis | Proposition, pas obligation technique. On peut afficher la facturation liée sans modifier le statut commercial d’acceptation. Si acomptes et échéances doivent produire plusieurs factures, une unicité absolue serait trop restrictive. |
| Un échec de transaction consomme un numéro | Incorrect ici. `DocumentSequence` est une ligne de table modifiée dans la transaction de création. Son incrément est annulé si cette transaction échoue. Ne pas le confondre avec une séquence PostgreSQL native appelée par `nextval`. |
| Les brouillons utilisent des numéros définitifs | Confirmé. Leur suppression est logique : le numéro reste en base, mais disparaît des listes courantes. Cela mérite une politique d’émission et d’archivage ; cela ne démontre pas à lui seul une non-conformité juridique. |
| `OVERDUE` peut être remplacé par `SENT` au recalcul sans paiement | Confirmé dans la fonction de recalcul. Mais l’exemple du rejet de paiement est incorrect : le service de rejet actuel n’appelle pas cette fonction. Les appels existants sont liés à un paiement confirmé ou enregistré. |
| Aucun avoir ou remboursement structuré | Confirmé dans le code étudié. La facture `PAID` ne peut pas être annulée par les transitions manuelles actuelles ; le rapport suggère à tort par endroits cette possibilité. |
| Acompte non opérationnel | À nuancer. Le montant demandé est calculé et affiché, et les paiements partiels existent. Il manque un parcours dédié de facture d’acompte, d’échéances et de suivi de l’acompte. Autoriser jusqu’au total n’est pas, en soi, un bug. |
| Pas de paiement en ligne | Confirmé, mais choix produit explicite : déclaration puis validation manuelle. Wave/Orange/MTN/Moov sont des méthodes d’encaissement, pas des intégrations PSP. Ce manque n’est pas automatiquement une faille. |
| Pas de relance ni d’expiration automatique | Confirmé. Plus important pour les devis : la réponse publique ne vérifie pas non plus `expiryDate`. Un devis resté `SENT` ou `VIEWED` peut encore être accepté après sa date affichée. Un cron ne doit pas remplacer cette vérification à l’acceptation. |
| Pas de repli de logo pour les factures | Incorrect comme conclusion globale. Le wrapper supplémentaire des devis est absent côté facture, mais `drawLogo`, dans le moteur PDF commun, intercepte déjà les erreurs et continue sans logo. |
| PDF incomplets | Confirmé : pas de payé/solde réel ni de ventilation récapitulative de TVA par taux ; les conditions ne sont pas transmises par le service facture ; notes/conditions sont limitées à quatre lignes. |
| Caractères non latins perdus | Confirmé. Le problème vient du nettoyage et des polices employées, pas d’une interdiction générale de l’UTF-8 dans les PDF. Une police couvrant les caractères visés et, selon l’écriture, une gestion adaptée de la mise en forme sont nécessaires. |
| Multi-devise absent | Formulation excessive. Une devise est stockée par document et conservée lors de la conversion. Le choix de devise de l’organisation existe. La couverture des décimales est limitée à cinq codes et il n’y a pas de change automatique. |
| Validations devis/factures asymétriques | Confirmé : des bornes et champs diffèrent. Les limites doivent aussi tenir compte du total calculé et des colonnes Prisma `Int`, pas uniquement de chaque champ pris séparément. |
| Totaux serveur fiables | Le recalcul centralisé est un bon point : les totaux du navigateur ne sont pas acceptés tels quels. Cela ne démontre pas que toutes les règles de prix, arrondis, bornes et autorisations sont exemptes de défaut. |

Références principales : `src/server/services/invoice-service.ts:70`, `src/server/repositories/document-sequence-repository.ts:10`, `src/server/repositories/invoice-repository.ts:61`, `src/server/repositories/invoice-repository.ts:247`, `src/server/services/payment-service.ts:64`, `src/server/repositories/quote-repository.ts:202`, `src/server/pdf/render-quote.ts:73`, `src/server/pdf/render-quote.ts:170`, `src/lib/formatting/currency.ts:10`.

Pour l’annulation des écritures d’une transaction : [documentation officielle PostgreSQL](https://www.postgresql.org/docs/current/tutorial-transactions.html).

## 4. Déploiement : ce qui est réel et ce qui est surestimé

- **`NODE_ENV` absent : le blocage annoncé est incorrect pour le démarrage prévu.** Le script `start` appelle `next start`. Dans la version installée, la CLI définit `NODE_ENV=production` s’il est absent. Une valeur explicitement erronée ou un serveur personnalisé reste un risque à contrôler. Ajouter une vérification explicite peut être utile, mais l’oubli pur et simple décrit ne suffit pas à contourner les protections. Références : `package.json:14`, `node_modules/next/dist/bin/next:65`, `node_modules/next/dist/bin/next:84`.
- **Docker force effectivement le stockage local**, malgré l’exemple de configuration S3. Cela concerne cette stratégie Docker et ne démontre pas que Hostinger ignore S3. Garder deux stratégies documentées est possible si elles sont cohérentes et clairement séparées.
- **Webpack en production et Turbopack en développement : différence réelle, panne non démontrée.** Les annotations Turbopack citées ne suffisent pas à prouver un défaut Webpack. Le bon contrôle est de construire et tester avec la commande réellement utilisée en production.
- **`standalone` non utilisé par `next start` : amélioration de configuration**, pas un incident majeur établi.
- **Migration avant compilation : risque opérationnel réel.** Une migration peut être appliquée alors que le nouveau code ne sera pas publié. La dernière migration de plafonnement des sessions est compatible avec l’ancien schéma ; cela ne garantit pas les migrations futures. Prévoir une procédure de migration compatible avec les versions coexistantes.
- **`DEFAULT_LOCALE` et `DEFAULT_CURRENCY` sont inutilisées**, mais les réglages réels de l’organisation sont bien utilisés ; ce n’est pas une absence totale de gestion de langue/devise.
- **`TRUSTED_ORIGINS` manque dans les exemples**, alors que le code le lit.
- **`.ptoken.tmp` existe et est ignoré**. Son contenu n’a pas été affiché pendant cette vérification. Son origine et sa validité ne sont pas établies ; un secret réel exposé doit être révoqué, pas seulement effacé. Aucune suppression n’a été effectuée.
- **Le cluster PostgreSQL local et les sorties `.next` ne sont pas des preuves de fuite en production**. Les exclusions Git/Docker sont présentes ; une copie manuelle du dossier doit néanmoins respecter ces exclusions.
- **Pas de TODO ne signifie pas “tout est terminé”**. Cela ne prouve ni la correction fonctionnelle ni l’exhaustivité des protections.

Références : `docker-compose.prod.yml:35`, `src/server/storage/private-storage.ts:58`, `next.config.mjs:25`, `src/lib/env/server.ts:35`, `src/server/services/organization-service.ts:53`, `.gitignore:22`, `.dockerignore:4`.

## 5. État des tests et limites de la vérification

- `npm run typecheck` : réussi.
- `npm run lint` : réussi.
- Tests ciblés existants de calcul, validation d’environnement, protections publiques et PDF : **24 tests réussis, six fichiers**.
- Un problème de fichiers temporaires Vitest dans le bac à sable a nécessité de relancer ces tests avec un répertoire temporaire local ; ce n’était pas une erreur métier.
- La suite d’intégration complète n’a pas été relancée ici. Il est incorrect de conclure que tous ses échecs seraient nécessairement dus à PostgreSQL absent : le test `contract-repository.test.ts:58` exige un événement initial, alors que `createContract` n’en crée aucun. Cette incohérence test/code est visible statiquement et avait déjà été observée lors de la validation précédente.
- Les tests PDF actuels valident surtout la structure du fichier et le nombre de pages ; ils ne démontrent pas que tous les caractères et toutes les clauses sont correctement reproduits.
- État local : aucun commit en avance sur la référence locale `origin/main`. Les modifications préexistantes `eslint.config.mjs`, `tsconfig.json` et le dossier `video/` ont été préservés. Cela ne remplace pas une nouvelle interrogation de GitHub ou de l’hébergement.

## 6. Ordre de travail recommandé

1. **Sécuriser le sens de la signature** : consentement serveur, révision attendue, transitions conditionnelles et transaction des preuves. C’est prioritaire sur l’ajout d’une simple trace `VIEWED`.
2. **Renforcer l’accès public** : limite de génération PDF, règles d’accès selon statut, rotation/révocation, validation d’adresse par OTP si souhaitée. L’IP n’est fiable que si le proxy remplace les en-têtes entrants ; la falsification en production n’a pas été démontrée ici.
3. **Fiabiliser les règles financières** : définir les conversions autorisées, garantir l’idempotence, refuser l’acceptation d’un devis expiré, clarifier les états de retard et les limites de montant.
4. **Conserver une référence documentaire** : révisions, identité et habillage figés, PDF final et dossier de preuve, politique d’émission/annulation, puis avoirs et acomptes selon les besoins.
5. **Compléter le produit** : modèles réutilisables, PDF et caractères, relances, devises supplémentaires ; intégrer un PSP seulement si le paiement automatique fait partie du périmètre voulu.
6. **Clarifier l’exploitation** : documentation Hostinger/Docker, variables réellement supportées, stratégie de migration et tests utilisant le build de production.
