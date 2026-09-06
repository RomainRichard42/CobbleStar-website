# Administration des joueurs — `/admin/joueurs/`

## Aperçu local sans connexion Discord

`npm.cmd run preview:admin` sert le dernier build du site sur `http://127.0.0.1:3001/admin/`. Il faut avoir généré `out/` auparavant avec `npm.cmd run build:site`.

Ce processus séparé n’écoute que sur la boucle locale. Un bandeau identifie les données fictives et la fiche `DEMO_DRESSEUR` ; les écritures sont refusées. Il ne charge aucune clé ni base et ne modifie pas l’authentification de production. Il ne reçoit **pas** les données du serveur Minecraft : pour la recette réelle, suivre l’activation ci-dessous avec une API joignable en HTTPS depuis le serveur.

## Activation (aucun accès par défaut)

1. Déployer l’API et le site ensemble après `npm.cmd run ci`. La migration `008_game_admin.sql` est appliquée par le mécanisme de migration existant au démarrage de l’API.
2. Dans l’environnement **privé de l’API**, renseigner `GAME_ADMIN_DISCORD_IDS` avec les identifiants Discord des administrateurs autorisés à modifier le jeu (séparés par des virgules). `GAME_ADMIN_READ_DISCORD_IDS` donne uniquement la consultation. Ce sont des **IDs utilisateurs**, pas des pseudos ni l’ID du serveur Discord. Aucun droit automatique pour les rédacteurs wiki.
3. Installer le JAR CobbleStar reconstruit à partir du dépôt principal. La passerelle est intégrée au mod principal, pas au vieux module autonome `minecraft-mod`. Ne pas installer deux versions de CobbleStar.
4. Au premier démarrage, le serveur crée `config/cobblestar-admin-bridge.json`. Arrêter le serveur, puis activer :

```json
{
  "enabled": true,
  "serverId": "main",
  "pollSeconds": 15
}
```

La passerelle réutilise `apiBaseUrl` (origine HTTPS sans `/api` final) et `serverKey` de **`config/cobblestar-link.json`**. La clé doit correspondre à `MINECRAFT_SERVER_KEY` côté API. Ne jamais l’exposer dans une variable `NEXT_PUBLIC_*`, le navigateur ou Git. Aucun port entrant supplémentaire sur Minecraft : uniquement des requêtes HTTPS sortantes.

5. Redémarrer le serveur, se connecter en jeu et ouvrir `/admin/joueurs/` avec le compte Discord autorisé. Les joueurs non liés via `/link` sont aussi recensés par UUID ; leur fiche n’a simplement pas de données de compte web.

## Données réellement couvertes

- Dernière présence, début de session, début du suivi (ce dernier **n’est pas** la première connexion historique), monde, position, mode de jeu, vie, faim, XP.
- Inventaire principal, barre rapide, armure, seconde main et coffre de l’End. Identifiant, nom, quantité et composants/NBT sérialisés (enchantements et contenu d’objets inclus si présents dans ces composants).
- Équipe et PC Cobblemon du joueur : UUID, espèce, nom, niveau, shiny et sauvegarde JSON Cobblemon consultable (IV/EV, capacités, nature, talent, etc.). Plafond explicite 6 000 Pokémon et 8 Mio par requête ; les grands relevés peuvent être refusés et sont alors signalés côté serveur, sans tronquer silencieusement les données affichées comme complètes.
- Compteurs non nuls Minecraft : jeu en ticks, distances en centimètres, morts, blocs minés, objets, entités, etc.
- Profil Academy : cartes, exemplaires, cosmétiques, compagnons et noms, coffres, compteurs d’exploration/donjons, carte dresseur.
- Progression du service de quêtes, en lecture seule.
- Compte web lié : identité Discord, date de création/liaison, Stars, votes et achats.

### Ce qui n’est pas couvert

Ce n’est **pas encore toutes les données de tous les mods**. Les professions, le battlepass, le classement compétitif, le GTS, les claims/clubs, l’économie distincte des Stars et les Pokémon temporairement détenus par d’autres systèmes (pension, échanges, etc.) nécessitent des adaptateurs dédiés. Les conteneurs du monde et les fichiers hors ligne ne sont pas parcourus. Les succès Minecraft ne sont pas exportés séparément. Aucun historique antérieur à l’activation n’est inventé.

L’historique mémorise les connexions/déconnexions, morts constatées et différences d’inventaire/PC/monde entre deux relevés. Ce n’est pas une capture exhaustive de chaque transaction : une action intermédiaire peut être invisible. Pas de journal des commandes, messages privés ou IP. Les événements en attente sont en mémoire, limités à 100 par joueur ; une panne/reprise peut créer un trou, signalé dans les logs. Les relevés de déconnexion expirent après environ cinq minutes de panne. Le relevé précédent reste consultable, mais n’autorise plus les écritures après 45 secondes sans présence fraîche.

## Modifications proposées

- Niveau d’XP Minecraft 0–1 000 ; vie 1–vie maximale ; faim 0–20.
- Quantité d’une pile existante, entre 0 et sa taille maximale. **0 supprime cette pile.** Aucun remplacement d’item ou import NBT arbitraire. Le menu/conteneur du joueur doit être fermé ; l’empreinte exacte de l’objet est revérifiée.
- Niveau d’un Pokémon actuellement dans l’équipe ou le PC personnel, 1–100, UUID et ancien niveau revérifiés. Cobblemon conserve la responsabilité de sa sauvegarde ; vérifier le comportement des évolutions/capacités lors de la recette en jeu.
- Débloquer un cosmétique du catalogue et désactiver tous les cosmétiques équipés. Pas de suppression d’un droit d’achat : la boutique restaure les droits achetés.

Toutes les actions exigent : session Discord autorisée, origine du site validée, motif de 5–300 caractères, confirmation UI, joueur récent/en ligne, pas de combat Cobblemon, validation serveur. Aucun accès console libre. Les comparaisons et écritures se font sur le thread serveur ; aucun accès à l’état vivant depuis le thread HTTP.

## Journal et erreurs

`queued` → `dispatched` → `applied` / `rejected` / `unknown`.

- Une requête web réutilisant son `requestId` n’ajoute pas une seconde intervention.
- Une seule intervention en vol par joueur. Une action non réclamée expire au bout de deux minutes.
- Une action réclamée **n’est jamais redistribuée**. Si la réponse réseau se perd, le statut devient **non confirmé**, pas « appliquée » et pas « échec ». Vérifier l’état réel avant de soumettre une nouvelle intervention. Le reçu seul peut être retenté.
- Journal : auteur Discord, motif, requête, résultat et état avant/après quand disponibles. L’application en mémoire et la sauvegarde disque ne forment pas une transaction distribuée : un crash peut nécessiter une vérification manuelle.
- Conservation : événements 90 jours, actions 365 jours, purge horaire par lots. Dernier relevé conservé jusqu’à suppression administrative des données ; prévoir cette table dans les procédures de suppression de compte/UUID et sauvegardes.
- Plusieurs serveurs : donner un `serverId` distinct à chaque instance et synchroniser leurs horloges. La même clé interne est partagée par le système actuel ; les serveurs qui la possèdent appartiennent au même périmètre de confiance. Ce n’est pas une isolation multi-tenant.

## Recette avant production

Tester avec un joueur de test et des objets sans valeur : refus sans session, refus compte ordinaire et compte wiki seul, lecture seule, présence, /link, inventaire avec enchantement, coffre End, PC et shiny, changements concurrents, combat, déconnexion, double clic, panne API avant/après exécution, résultat refusé et non confirmé. Vérifier les sauvegardes après reconnexion/redémarrage. Mesurer le temps de capture et la charge réseau avec la taille réelle des PC et le nombre de joueurs : les relevés sont étalés, mais les données Cobblemon se sérialisent sur le thread serveur.

Tests API : `npm.cmd --prefix api run test:game-admin` (schémas, droits, origine, comparaison de valeurs, idempotence et cycle de commande avec une doublure de base). Test navigateur : `node scripts/test-game-admin-ui.mjs <chemin-absolu-vers-playwright/index.mjs>`, après le build du site ; il utilise des données fictives explicitement identifiées et ne contacte pas Minecraft.

Les tests automatisés du schéma et des gardes API ne remplacent ni la migration sur une base MySQL de recette, ni la vérification Minecraft + API en fonctionnement.
