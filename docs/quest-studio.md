# Studio Quêtes & PNJ

> L’interface a été remplacée par l’Atelier Scénarios. Pour les auteurs, lire [Écrire une aventure](atelier-scenarios.md). Ce document conserve les détails techniques de la passerelle.

Route : `/admin/creation/`, accessible depuis le panneau admin, entrée **Quêtes & PNJ**.
Le studio utilise la session Discord et les droits existants `GAME_ADMIN_DISCORD_IDS` (écriture) et `GAME_ADMIN_READ_DISCORD_IDS` (lecture). Il ne crée pas de connexion publique ni de console distante.

## Installer cette version

1. Sauvegarder la base de données et, serveur Minecraft arrêté, `config/cobblestar-quests/quests.json` et le dossier `cobblestar-quests` du monde (progressions, PNJ et cache).
2. Déployer ensemble le site compilé, l’API compilée et les migrations, dont `api/migrations/010_quest_studio.sql`. Le démarrage habituel `npm run kinetic` dans l’API exécute les migrations avant le serveur HTTP. Sinon : `npm run migrate`, puis `npm start`, dans l’API déjà compilée et configurée.
3. Remplacer le JAR serveur par le nouveau `build/libs/cobblestar-6.19.0.jar`, puis redémarrer Minecraft. Aucun nouveau canal réseau client n’est nécessaire pour la liaison ; conserver des versions client/serveur cohérentes pour les autres interfaces du mod.
4. Dans `config/cobblestar-admin-bridge.json`, conserver les autres réglages et vérifier `"enabled": true` et le `serverId` habituel, par exemple `"main"`. Ne pas changer cet identifiant après publication : il sélectionne le catalogue.
5. Réutiliser `config/cobblestar-link.json` : `apiBaseUrl` doit être l’origine HTTPS de l’API (par exemple `https://cobblestar-mc.fr`, sans ajouter `/api`) et `serverKey` la clé serveur existante correspondant à `MINECRAFT_SERVER_KEY` côté API. Ne jamais mettre cette clé dans le navigateur ni dans Git. Les changements de configuration nécessitent un redémarrage Minecraft.
6. Vérifier dans les logs `Quest Studio bridge: enabled`, puis ouvrir le studio. Le premier échange intervient après environ 15 secondes à 20 TPS, même sans joueur connecté. Le serveur doit pouvoir joindre l’API en HTTPS.

Une API ancienne répondra 404 à la passerelle. Un JAR ancien ne fera pas apparaître le serveur dans ce nouveau studio. Le déploiement nécessite donc les deux côtés, pas uniquement le site.

## Créer une rencontre de bout en bout

1. Choisir le serveur. **Importer l’existant du serveur** récupère les quêtes locales et les modèles web déjà connus, sans modifier le jeu. Les PNJ locaux non liés apparaissent dans l’inventaire des placements ; leurs dialogues locaux ne sont pas convertis automatiquement en modèles web.
2. Créer une quête : introduction, prérequis, étapes guidées et récompenses. Organiser les quêtes narratives dans les chapitres si nécessaire.
3. Créer un PNJ avec un nom unique, par exemple `Professeur Asteria`. Choisir sa fonction, ses quêtes, sa couleur, son skin et ses répliques. Relier les réponses à d’autres répliques et, si souhaité, à l’acceptation d’une quête attribuée à ce PNJ.
4. **Enregistrer** ne modifie que le brouillon. **Publier en jeu** demande une confirmation et un motif conservé avec l’identité Discord et la version.
5. Attendre **Serveur à jour**. L’accusé d’application remonte lors de l’échange suivant : compter généralement 15 à 30 secondes à 20 TPS, davantage si le serveur ralentit.
6. En jeu, obtenir le bâton avec `/queteadmin baton` (opérateur niveau 4), puis placer ou éditer un PNJ. Dans son champ nom, saisir `Professeur Asteria` (la liaison interne utilise un identifiant stable masqué), puis enregistrer. La casse et les espaces répétés du nom ne bloquent pas la correspondance.
7. Le PNJ prend les réglages publiés. Son identifiant web est désormais conservé : un renommage sur le site continue de mettre à jour le même personnage. Plusieurs PNJ placés peuvent utiliser un même modèle. Le site ne crée pas de nouvelles entités et ne déplace pas leurs ancres.
8. Tester la rencontre avec un compte joueur : dialogue, acceptation, progression réelle de l’objectif, remise et récompense. Vérifier également les prérequis et les permissions avec un compte non opérateur.

Les réglages web sont prioritaires pour un PNJ lié. Pour le rendre local, enregistrer son nom avec le préfixe `local:`, par exemple `local:Professeur Asteria`. Le préfixe disparaît du nom affiché et bloque les prochaines liaisons automatiques. Pour le relier, enregistrer à nouveau un nom ou identifiant de modèle actif.

## Protections et limites explicites

- Les brouillons ne sont jamais appliqués automatiquement. Les versions concurrentes sont refusées plutôt qu’écrasées. L’historique permet de reprendre une publication en brouillon, puis de la republier explicitement.
- Les quêtes et chapitres sont fusionnés par identifiant. Une omission n’efface pas les quêtes locales ni les progressions. Reprendre une ancienne publication n’est donc pas un retour destructif complet de la base du jeu.
- Une quête ayant une progression enregistrée ne peut plus changer de type, de nombre, d’ordre ou de nature d’objectifs sous le même identifiant. La dupliquer pour ce changement. Les textes et cibles restent éditables ; changer une cible affecte les conditions de complétion des joueurs existants.
- Décocher **Synchroniser ce modèle** fige les réglages déjà appliqués. Cela ne supprime ni ne désactive l’entité en jeu.
- Le dialogue non répétable est marqué comme vu à sa première ouverture, par joueur et modèle. Les services et quêtes du PNJ restent accessibles ensuite. Les fonctions Pension et Combats classés ouvrent leur service natif.
- Les commandes de récompense web sont limitées à `give {player} namespace:objet 1–64` et `experience add {player} quantité points|levels`. Pas de commandes arbitraires, de permissions, de grades ou de modifications d’un autre joueur. Une ancienne quête avec d’autres commandes doit être adaptée avant enregistrement web ; rien n’est retiré silencieusement.
- Les identifiants d’objets et événements viennent du moteur et des mods installés. Le site valide leur format, pas leur présence dans le registre Minecraft ; vérifier les objets, filtres et événements en jeu. Il ne crée pas de nouveaux événements de progression.
- Offres de marchand : une ligne `namespace:objet|quantité|prix achat|prix revente`, quantité de 1 à 64, prix entiers ; 0 désactive ce sens de transaction. Exemple : `cobblemon:poke_ball|8|100|0`.
- Skins : l’interface propose des apparences par nom et conserve les skins personnalisés existants. Les formats techniques historiques restent lisibles côté mod. Pas d’envoi de fichier ou d’URL de skin depuis le site. Les skins de joueurs dépendent de la résolution du profil par le client ; un échec peut afficher Steve.
- Une fiche PNJ est limitée à 18 Ko UTF-8 pour respecter le paquet réseau Minecraft. Maximum 80 répliques et 8 choix par réplique, sous cette limite totale. Si le catalogue dépasse le paquet de l’éditeur natif, le bâton conserve l’édition du personnage mais renvoie vers le site pour les quêtes.
- Le parcours des branches dans le studio est une simulation de logique, pas un aperçu du rendu Minecraft. Il n’accepte pas réellement de quête pour un joueur.
- Le dernier contenu appliqué est mis en cache dans `<monde>/cobblestar-quests/web-published.json`. Les fichiers modifiés possèdent une copie précédente `.web-backup`. Les écritures sont atomiques par fichier quand le système le permet, pas une transaction globale entre plusieurs fichiers. Une erreur d’application est remontée et la publication sera retentée.

## Vérifications locales

`npm --prefix api test`, `npm run build:site`, `npm run lint`.

Test navigateur sur le véritable export du site avec API de test isolée :

```powershell
node scripts/test-quest-studio-ui.mjs 'CHEMIN_VERS_PLAYWRIGHT/index.mjs'
```

Ce test couvre création de quête/récompense/PNJ/choix, sauvegarde, publication explicite, affichage mobile et refus des modifications en lecture seule. Les captures sont enregistrées dans `ui-review-quest-studio/` ; elles contiennent des données de test, pas des joueurs réels.

Le build du mod et les tests locaux ne remplacent pas un essai en jeu. La migration MySQL et la synchronisation avec le serveur de production doivent encore être validées après déploiement.
