# Identité Minecraft et récupération Discord

## Modèle

- Un profil joueur par UUID Minecraft (32 caractères hexadécimaux normalisés).
- `users.minecraft_uuid` est unique et devient l'identifiant public `identity.id` / `name` de `/api/me` après liaison. Le pseudo reste un libellé lisible, pas une clé de recherche de compte.
- La clé SQL `users.id` reste stable pour préserver les références aux achats, votes et journaux. On ne renomme pas les clés étrangères.
- Discord est le seul moyen de connexion. L'e-mail Discord vérifié est une donnée de contact (`discord_email`), jamais une preuve de propriété Minecraft. L'ancien champ `email` reste historique.
- Aucun rapprochement automatique par e-mail dans OAuth. Un ancien profil sans Discord se récupère par preuve en jeu.

## Mise en service

1. Sauvegarder la base et les fichiers de l'API. Déployer ensemble le site, l'API et la migration `009_uuid_identity.sql` via le processus Kinetic habituel (voir [DEPLOIEMENT_KINETIC.md](DEPLOIEMENT_KINETIC.md)). Un push seul n'est pas un déploiement.
2. Le démarrage applique les migrations. Les anciennes commandes `/link` sont invalidées. Les sessions Discord existantes sont liées à leur identifiant Discord ; les anciennes sessions sans Discord ne sont plus acceptées. Les administrateurs wiki doivent se reconnecter une fois pour revalider leur e-mail Discord (les permissions ne sont jamais héritées de l'e-mail historique d'un joueur récupéré).
3. Vérifier que le serveur Minecraft authentifie les UUID : serveur en ligne authentifié, ou proxy authentifié avec transfert d'identité sécurisé et accès direct au backend interdit. Ne JAMAIS activer la récupération sur un serveur public offline-mode où l'on peut usurper un joueur. Protéger la clé `MINECRAFT_SERVER_KEY`, réservée au serveur.
4. Après cette vérification, ajouter `MINECRAFT_RELINK_ENABLED=true` à l'environnement de l'API et redémarrer. Sans cela, seules les premières liaisons et la reconfirmation du même profil fonctionnent.
5. Vérifier `/api/health` : `version: "uuid-identity-v1"`. `/api/link/status`, connecté, doit annoncer `relinkEnabled: true`.

Le contrat serveur reste `POST /api/internal/link/confirm` avec code, UUID et pseudo, et une réponse 200 `linked: true`. Aucun changement de JAR n'est nécessaire pour une liaison réussie. Un ancien JAR peut encore afficher un message 409 générique si la récupération est désactivée ; consulter alors la configuration et l'espace compte.

## Parcours pour LhShiroe

1. Se connecter au site avec Discord `727592760982372381`.
2. Dans `/compte/`, ouvrir « Récupérer / changer la liaison Minecraft » si le compte est déjà lié. Pour un compte provisoire, le panneau est déjà ouvert.
3. Vérifier l'identifiant Discord affiché, lire les conséquences et cocher la confirmation. Générer une commande personnelle.
4. Exécuter cette commande en jeu en tant que LhShiroe. L'UUID provient du joueur connecté côté serveur, jamais d'un champ éditable dans le navigateur.
5. La page suit CETTE demande et recharge le profil et les Stars à sa confirmation. Le navigateur initiateur est conservé ; les autres sessions des deux profils sont révoquées.

Ne jamais exécuter un code envoyé par un autre joueur : il pourrait associer son Discord à votre personnage. Les codes expirent en dix minutes, sont stockés sous forme de hash, liés à leur session et invalidés à la déconnexion/au changement d'identité. La génération d'un nouveau code remplace le précédent.

## Conservation des données

| Situation | Résultat |
| --- | --- |
| Compte Discord provisoire, UUID inconnu | Première liaison sur ce compte, données conservées |
| Compte provisoire, UUID déjà existant | Profil UUID conservé, Stars additionnées exactement, achats/transactions/votes/livraisons regroupés |
| Même UUID déjà lié au même compte | Pseudo actualisé, aucun transfert financier |
| Discord déjà lié à un autre UUID | Discord déplacé vers le profil choisi ; chaque UUID garde ses Stars, achats, votes et données de jeu |
| UUID choisi associé à un autre Discord | Ancien accès révoqué ; il ne peut plus ouvrir ce profil sans une nouvelle preuve Minecraft |

La récupération n'est PAS un outil de transfert de biens entre deux personnages. Les récompenses déjà livrées ne sont pas rejouées, les références de paiement et les états de livraison restent intacts. Les données de jeu sont déjà indexées par UUID et ne sont pas réécrites. Les comptes provisoires regroupés restent archivés via `merged_into`, sans session ni Discord, pour préserver les références historiques d'administration. Les droits administrateur ne se transfèrent pas depuis l'ancien Discord.

La transaction verrouille comptes, sessions et portefeuilles. Une erreur annule toute l'opération. Les confirmations simultanées perdantes peuvent recevoir `LINK_BUSY_RETRY` (503), sans transfert partiel. `account_link_events` conserve les identités avant/après et le détail des données regroupées, sans code en clair ni jeton OAuth.

## Vérification

- `npm --prefix api test` : logique, contrôles HTTP et suite d'intégration MySQL si activée.
- CI : base MySQL 8 jetable, `cobblestar_link_test`, réservée aux fixtures. Les tests couvrent regroupement, préservation des livraisons, changement d'UUID, rollback et concurrence. Sans `LINK_TEST_MYSQL_PORT`, cette suite est explicitement ignorée ; les tests unitaires ne valident pas le moteur SQL.
- `node scripts/test-account-link-ui.mjs <chemin vers playwright/index.mjs>` : vrai build statique, API simulée, desktop et mobile. Aucune modification d'un compte réel.
- Tester enfin en préproduction avec deux comptes de test, comparer les soldes/historiques, puis tester en jeu. Ne pas présenter des fixtures ou une compilation comme preuve d'une migration de production.
