# Administration Discord

La rubrique `/admin/discord/` est accessible depuis le centre de contrôle. Elle utilise la session Discord du site et les listes `GAME_ADMIN_DISCORD_IDS` (lecture/écriture) et `GAME_ADMIN_READ_DISCORD_IDS` (lecture). Aucun token Discord n’est envoyé au navigateur. Les écritures exigent aussi une origine correspondant à `SITE_ORIGIN` et sont limitées à 10 requêtes/minute.

## Fonctions

- État de la connexion du bot, nombre de membres Discord, salons, catégories et hiérarchie des rôles.
- Tickets, événements et participations, messages transmis/en attente/en nouvelle tentative, graphique sur les 30 derniers jours UTC. Ces données suivent la durée de conservation existante : elles ne représentent pas l’historique de toutes les conversations du serveur.
- Recherche de membres par début de nom/pseudo et parcours par pages de 50. Aucune présence en ligne n’est collectée.
- Activation/pause des associations Minecraft et des compteurs existants ; édition des associations de grades, premium, rangs et clubs ; destinations GTS et mini-jeux.
- Attribution/retrait individuel d’un rôle non privilégié. Les comptes bots, membres non gérables, rôles du staff, rôles gérés, rôles au-dessus du bot et rôles associés à Minecraft sont exclus.
- Historique des changements, avec acteur, motif et résultat. Un résultat `unknown` demande une vérification du membre avant une nouvelle action : aucune relance automatique après un résultat Discord incertain.

Les réglages utilisent une version de la configuration et un verrou SQL : une page périmée reçoit un conflit plutôt que d’écraser des changements récents. Les destinations privées, droits des salons, suppression de salons et modération des membres restent dans Discord. Les tickets et événements proposent un lien direct vers leur salon/message. Une pause de la synchronisation ne retire pas les rôles déjà attribués.

## Déploiement et contrôle

Le démarrage habituel applique `020_discord_admin.sql`, table additive d’audit. Le panneau réutilise le client du bot après son démarrage réussi ; il ne crée aucune seconde connexion Gateway. Un bot hors ligne laisse les statistiques conservées consultables et bloque les actions.

Après compilation du site et de l’API, redémarrer le service Kinetic. Vérifier la présence du lien Discord dans `/admin/`, l’authentification, la liste des membres, les permissions de lecture seule et l’état connecté. Les tests `api/test/discord-admin.test.mjs` couvrent les refus d’accès/CSRF, les conflits de configuration, les rôles protégés, l’idempotence et les résultats incertains à l’aide de doublures SQL/Discord. Les tests ne publient aucun message et ne modifient aucun membre réel.

`node scripts/local-admin-preview.mjs 8791` sert l’export `out/` sur loopback avec des données fictives explicites et les modifications désactivées. Les fixtures ne sont jamais importées par l’API de production.
