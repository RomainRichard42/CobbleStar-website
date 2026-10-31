# Achats de Stars avec Stripe Checkout

Le site prépare un achat unique sur la page de paiement hébergée par Stripe.
Il ne collecte pas les données de carte. Aucun SDK Stripe, clé secrète ou
traceur de paiement n'est chargé dans le navigateur du joueur.

## État initial

- L'intégration est désactivée par défaut (`STRIPE_ENABLED=false`).
- Le mode par défaut est `test`. Les comptes Discord de
  `GAME_ADMIN_DISCORD_IDS` sont seuls autorisés à ouvrir un paiement de test.
- Un paiement de test est enregistré avec le statut `test_paid` ; il ne
  crédite aucun portefeuille et n'entre pas dans le chiffre d'affaires réel.
- Les prix déjà affichés sont conservés dans `api/stars.catalog.json` :
  500/4,99 €, 1 100/9,99 €, 2 400/20 €, 3 600/30 €, 6 500/49,99 €.
  Les bonus sont compris dans ces totaux.
- La préouverture, les comptes, les achats en jeu et le bot sont conservés.

## Raccordement au compte Stripe

1. Le propriétaire crée ou sélectionne un compte Stripe dédié à CobbleStar.
   Il complète lui-même les informations d'entreprise, d'identité et bancaires.
   Ne jamais transmettre ces informations ou les clés dans le chat ou Git.
2. Déployer le code, le catalogue, le SDK (`npm install`) et la migration
   `023_stripe_payments.sql`. Le démarrage de l'API applique les migrations.
3. Dans l'environnement de test Stripe, créer une destination webhook HTTPS :
   `https://cobblestar-mc.fr/api/payments/stripe/webhook`.
   Sélectionner les événements :
   - `checkout.session.completed`
   - `checkout.session.async_payment_succeeded`
   - `checkout.session.async_payment_failed`
   - `checkout.session.expired`
4. Conserver la version des événements compatible avec le SDK installé
   (`stripe` 23.1.0, API `2026-10-28.endive`). Dans le `.env` du serveur Web
   uniquement, renseigner :

   ```dotenv
   STRIPE_ENABLED=true
   STRIPE_MODE=test
   STRIPE_SECRET_KEY=<clé serveur de test rk_test_... ou sk_test_...>
   STRIPE_WEBHOOK_SECRET=<secret de cette destination whsec_...>
   ENABLE_TEST_PURCHASES=false
   ```

   Aucune clé publique n'est nécessaire pour cette intégration hébergée.
   Le secret du Stripe CLI n'est pas celui de la destination du Dashboard.
   Les clés restreintes `rk_test_...` / `rk_live_...` et les clés secrètes
   `sk_test_...` / `sk_live_...` sont acceptées uniquement dans leur mode.
   Privilégier une clé restreinte au paiement ponctuel, autorisée à créer et
   relire les sessions Checkout ainsi que leurs produits et prix. Les clés
   publiques et les clés d'organisation sont refusées.
5. Redémarrer l'API. Connecté avec un compte staff dont Minecraft est lié,
   choisir un pack dans `/boutique/#stars`, puis « Tester le paiement Stripe ».
   Utiliser les données de test documentées par Stripe, jamais une vraie carte.

## Vérifications avant paiements réels

- Parcourir Stripe Checkout jusqu'au retour vers la boutique. Le total doit
  correspondre au pack, le statut doit devenir `test_paid`, et le vrai solde
  doit rester inchangé. Vérifier aussi l'annulation et l'expiration.
- Dans les livraisons Stripe, vérifier une réponse HTTP 200 puis renvoyer le
  même événement : toujours un seul traitement, toujours aucun crédit de test.
- Vérifier la migration et l'atomicité sur une base MySQL de recette. Les tests
  locaux du dépôt emploient des doubles de base. `stripe-mysql.test.mjs` vérifie
  aussi la migration, les verrous et le rollback sur le service MySQL jetable de
  la CI. Aucun de ces tests ne constitue un paiement dans un compte Stripe réel.
- Valider les prix finaux, les informations de vente, le support et la procédure
  de remboursement du marchand. Cette première intégration n'automatise pas
  les remboursements, litiges ou retraits de Stars : ceux-ci restent à traiter
  manuellement avec rapprochement de la commande et du portefeuille.
- L'activation réelle reste une opération distincte : compte marchand activé,
  destination webhook en mode réel avec ses propres secrets, `STRIPE_MODE=live`,
  `STRIPE_ENABLED=true`, et FAQ de la boutique mise à jour au moment de l'ouverture.
  Ne pas réutiliser les clés de test. Ne pas mettre de clés réelles dans la CI.

## Fiabilité et rapprochement

Le navigateur envoie uniquement l'identifiant du pack et un UUID de tentative.
Le serveur choisit le prix et les Stars, vérifie à nouveau la session Discord
et le Minecraft lié sous verrou SQL, puis fige la commande. Les tentatives
répétées réutilisent la même clé d'idempotence Stripe pendant sa validité.

Le webhook utilise les octets bruts et la vérification de signature du SDK.
Il relit la session chez Stripe, vérifie le compte destinataire, la référence,
le pack, le mode, la devise, le montant et la quantité. Seul un paiement
`paid` et `complete` peut être livré. En mode réel, portefeuille, historique,
commande et accusé de réception sont validés dans la même transaction SQL.
Le verrou de commande et les références uniques empêchent un double crédit.
Une panne renvoie une erreur pour que Stripe retente sa livraison.

`GET /api/shop/orders/:id` ne retourne que la commande du joueur connecté.
Le paramètre `commande` de l'URL de retour ne déclenche aucun crédit. Le client
attend la confirmation serveur, puis rafraîchit le solde sans l'incrémenter
lui-même. `STRIPE_ENABLED=false` arrête les nouveaux achats ; les webhooks
des paiements déjà commencés restent traités si les secrets sont conservés.

Les tables de rapprochement ne stockent ni carte, ni adresse, ni corps brut
des événements : seulement références techniques et état de la commande.
Les secrets et les erreurs détaillées du SDK ne sont pas journalisés.

## Annonce dans le chat Minecraft

La migration `024_purchase_announcements.sql` ajoute une file liée à la
commande. Une annonce est insérée uniquement lors du nouveau crédit réel,
dans la même transaction que le portefeuille et l'historique. Une confirmation
Stripe répétée ne recrée ni crédit ni annonce. Les commandes historiques ne
sont pas reprises. L'annonce expose uniquement le pseudo et les Stars reçues.

Core serveur 1.1.1 récupère la file avec les routes authentifiées
`POST /api/internal/stars/announcements/claim` et `/:id/complete`, protégées
par la clé serveur existante. Les baux durent deux minutes ; les accusés sont
idempotents. Une jointure avec la commande `paid` et le checkout `live` protège
aussi la lecture de la file. Aucun endpoint public ne peut créer un message.
Le journal local du module empêche de répéter le message après un accusé perdu.
Voir [le fonctionnement hors ligne et les limites de panne](../minecraft-mod/README.md#annonces-de-recharge).

## Validation locale

```sh
npm --prefix api test
npm run lint
npm run build:site
npm run test:public
```

Tests ciblés : `api/test/stripe-payments.test.mjs` (routes, vrai validateur de
signature du SDK, prix, authentification, mode test, idempotence et retours)
et `api/test/stripe-store.test.mjs` (vrai store SQL sur double transactionnel,
notifications concurrentes, paiement différé, rapprochement, rollback et
absence de crédit de test).

Références officielles : [livraison Checkout](https://docs.stripe.com/checkout/fulfillment?ui=full-page),
[signature des webhooks](https://docs.stripe.com/webhooks/signature),
[création d'une session](https://docs.stripe.com/api/checkout/sessions/create).
