# Studio des arènes — contrat API v1

Cette fonctionnalité pilote les 8 arènes et les 5 étapes de Ligue natives du mod CobbleStar. Elle ne crée pas de commandes console distantes et ne touche pas aux Stars de la boutique.

## Installation

- Déployer ensemble le site, l'API et le mod compatibles avec ce contrat.
- La migration `011_arena_studio.sql` ajoute seulement `arena_studio` et `arena_publications`. Elle est appliquée par la commande habituelle `npm run migrate` (également exécutée par `npm run kinetic`). Aucun nettoyage des progressions joueurs.
- Le mod utilise l'URL d'API et la clé serveur existantes, dans `Authorization: Bearer …` ou `X-Cobblestar-Server-Key`. Ne jamais mettre cette clé dans le navigateur.
- Administration : session Discord et rôle `GAME_ADMIN_DISCORD_IDS`. Le rôle `GAME_ADMIN_READ_DISCORD_IDS` peut consulter mais pas enregistrer/publier. Les écritures exigent un `Origin` identique à `SITE_ORIGIN`.
- Sans première synchronisation du mod, aucun serveur n'est inventé dans le panneau.

## Endpoints

| Méthode / route | Fonction |
| --- | --- |
| `GET /api/admin/arenas` | Serveurs observés, révisions, dernière connexion et droit d'écriture |
| `GET /api/admin/arenas/:serverId` | Brouillon `content`, configuration réellement `observed`, `catalog`, `runtime`, révisions, erreur et 20 publications récentes |
| `PUT /api/admin/arenas/:serverId` | `{baseRevision, content}` ; retourne `draftRevision` |
| `POST /api/admin/arenas/:serverId/publish` | `{baseRevision, reason}` ; retourne `publishedRevision` après validation |
| `GET /api/admin/arenas/:serverId/history/:revision` | Contenu de cette publication, sans restauration automatique |
| `POST /api/internal/arenas/sync` | Synchronisation authentifiée du mod ; retourne `{revision, content}` de la publication, ou `{revision:0, content:null}` |

Le contenu est `{schemaVersion:1, stages:[…]}`. Le schéma exact est `src/arena-studio-schema.ts` ; les noms, équipes, classes de PNJ, difficulté et récompenses sont éditables. IDs, ordre, thèmes, coordonnées et badges sont fixes pour les bâtiments existants.

Une équipe contient 1 à 6 Pokémon. Chaque Pokémon porte espèce, niveau, shiny, nature/talent facultatifs, 0 à 4 attaques, objet tenu facultatif, genre, 6 IV, 6 EV (510 maximum) et aspects de forme. Les identifiants sont validés contre les vrais registres envoyés par le serveur. Le mod contrôle à nouveau les identifiants, les limites et les combinaisons de forme avant application. L'atelier autorise les attaques et talents installés : ce n'est pas un vérificateur de légalité compétitive par espèce.

Jusqu'à 6 dresseurs par site, emplacements 0–5 distincts. Leur ID est stable : renommer un dresseur ne crée pas un nouvel ID ni une nouvelle première victoire. Un dresseur désactivé ne peut pas rester obligatoire.

Récompenses typées : jusqu'à 8 lignes d'objets (1–64), XP en points (0–100000), CobbleCoins (0–1000000). Leur remise à la première victoire est une responsabilité du mod ; publier ne distribue aucune récompense.

## Synchronisation

```json
{
  "serverId": "main",
  "appliedRevision": 0,
  "error": "",
  "observed": {
    "arenaConfig": { "schemaVersion": 1, "stages": [] },
    "catalog": {
      "protocol": 1,
      "species": [], "items": [], "moves": [],
      "abilities": [], "natures": [], "npcClasses": []
    },
    "runtime": {
      "pendingRewards": 0, "reviewRewards": 0,
      "activeBattles": 0, "worldReady": false
    }
  }
}
```

L'exemple montre uniquement l'enveloppe : `stages` doit réellement contenir les 13 sites, pas une liste vide. Les registres contiennent `{id,label}` ; les espèces peuvent ajouter `forms:[{id,label,aspects:[]}]`. `catalog` et `runtime` sont optionnels sur les petits heartbeats : leur omission conserve la dernière valeur connue.

- Le premier état réel initialise un brouillon à la révision 1. Une synchronisation ultérieure ne remplace jamais un brouillon ou une publication.
- Sauvegarder ne publie pas. Publier n'affirme pas que le mod a appliqué : `publishedRevision` et `appliedRevision` restent distincts.
- `hasUnpublishedChanges` compare le contenu du brouillon à la publication. Le bouton Publier doit utiliser ce booléen, pas l'égalité de `draftRevision` et `publishedRevision` : leurs compteurs sont indépendants.
- Le mod confirme la révision seulement après validation et écriture locales réussies ; sinon il conserve sa configuration active et envoie `error`.
- Une révision appliquée supérieure aux publications de cette API est refusée (`UNKNOWN_APPLIED_REVISION`), sans mutation de l'état enregistré.
- Concurrence : `SELECT … FOR UPDATE`, comparaison de `baseRevision` et transaction publication/audit. Deux sauvegardes concurrentes de la même base donnent un succès et un conflit 409. Une double publication de contenu identique ne crée qu'une révision.
- `legacyProperties` est un champ de migration conservé sans éditeur libre. Une publication ne peut que reprendre une valeur observée/publiée pour la même espèce. Les aspects hérités déjà observés peuvent être préservés sans inventer de nouvelles formes.
- Corps limités à 2 Mio. Aucun champ commande arbitraire, permission LuckPerms, Stars ou ciblage de joueur accepté.

## Vérification

`npm test` compile l'API et exécute les tests schéma, registres, sécurité HTTP et transaction avec double de base de données. `account-link-mysql.test.mjs` réutilise ensuite le même scénario HTTP sur le MySQL 8 jetable de la CI, après les vraies migrations, uniquement si `LINK_TEST_MYSQL_PORT` est défini. Ne jamais pointer ces fixtures vers une base de production.

Ces tests ne remplacent pas une victoire réelle en jeu et la vérification des récompenses côté serveur.

Une sonde exécutée dans le vrai serveur peut exporter `{content,catalog,passed,pokemonCreated}`. Vérifie ensuite le contrat sans aucune base de données :

```powershell
node api/test/check-arena-runtime-contract.mjs "chemin/arena-runtime-probe.json" --require-native-success
```

Le script réutilise les vrais schémas de synchronisation, vérifie l'ensemble des registres/formes et la taille exacte du corps JSON. Sans `--require-native-success`, il vérifie uniquement le contrat API et rapporte séparément le résultat de la sonde native ; ce n'est pas une validation du gameplay.
