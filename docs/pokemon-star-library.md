# Atelier Star : bibliothèque, aperçus et kits Blockbench

## Utilisation

Dans **Admin → Pokémon Star** :

- **Avec version Star** : espèces publiées, aperçu 3D du modèle publié et révision. Un brouillon plus récent est signalé, sans remplacer cet aperçu.
- **Sans version Star** : espèces à créer ; un brouillon seul reste ici et porte la mention « non publié ».
- Recherche par nom français ou identifiant Cobblemon, pagination de six espèces.
- **Ouvrir l'atelier** sélectionne l'espèce et descend aux outils d'import/publication.
- **ZIP du modèle de base** : géométrie native, texture, calque lumineux vierge transparent, instructions, références de pose/animation disponibles et licence. 884 formes de base Cobblemon 1.8.0 sont fournies.
- **ZIP Star publié / ZIP du brouillon** : téléchargement des fichiers exacts enregistrés, avec le calque lumineux s'il existe.
- Dans l'atelier, l'aperçu montre le brouillon enregistré. Les fichiers importés doivent d'abord être enregistrés pour apparaître. Publier reste une action distincte avec confirmation.

Les aperçus sont des modèles 3D texturés en pose fixe, pas des animations de jeu. Glisser pour tourner ; molette pour zoomer. Ils utilisent la géométrie Bedrock, les parents et pivots des os, les UV et le calque lumineux. Ils ne reproduisent pas les shaders Minecraft ni les expressions des posers Cobblemon. Le bouton de chargement du preset Dracolosse a été supprimé ; aucune donnée publiée n'est supprimée.

## Déploiement

Mettre à jour **site et API ensemble**. Aucun nouveau JAR de mod ni migration SQL nécessaires.
`npm run package:kinetic` inclut automatiquement `api/star-templates/` dans `deploy/star-templates/`. Ne pas copier uniquement `dist/` : l'API doit également trouver les kits et leur index.

Les aperçus et ZIP sont servis par les routes privées `/api/admin/star/:species/asset` et `/api/admin/star/:species/kit`. Un compte autorisé en lecture peut consulter/télécharger ; import et publication restent réservés aux administrateurs en écriture. Les réponses privées ne sont pas mises en cache.

Si le squelette du serveur diffère du kit livré, son téléchargement natif est refusé pour éviter une base incompatible. Sans catalogue serveur, les kits peuvent être préparés, mais l'import/publication reste bloqué jusqu'à synchronisation.

## Régénérer les kits

Après installation des dépendances :

```powershell
npm.cmd run build:api
node scripts/export-star-templates.mjs "C:/chemin/Cobblemon-fabric-1.8.0+1.21.1.jar"
```

L'exporteur lit le JAR officiel donné explicitement, ses résolveurs de base, son catalogue français et ses assets. Il n'extrait aucune configuration du serveur. Le SHA256 du JAR figure dans l'index. Les PNG indexés sont réencodés sans perte en RGBA pour être réimportables ; les pixels restent identiques. Chaque kit passe le validateur Star avant validation de l'index. La borne de réduction des cubes accepte désormais les valeurs natives, dont -6,75 pour Pyrobut, tout en restant bornée à -8.

## Vérifications réalisées

Build API et export statique du site ; lint ciblé ; tests des droits, des révisions publié/brouillon, du contenu ZIP et de la validation des assets. Export validé pour les 884 kits. Contrôle navigateur local avec données de démonstration et véritable modèle Dracolosse Star : affichage 3D, recherche Gobou, téléchargement du ZIP correct, absence du preset, desktop et mobile sans débordement horizontal. Pas de modification de la base de production pendant ces contrôles.

Documentation de rendu utilisée : [Three.js BoxGeometry](https://threejs.org/docs/pages/BoxGeometry.html), [OrbitControls](https://threejs.org/docs/pages/OrbitControls.html).

## Pokédex public — 27 octobre 2026

`/wiki/pokedex/` est une page Astro liée depuis le wiki, la boutique et le sitemap. Elle reçoit uniquement les espèces du catalogue serveur, les variantes Star publiées (avec Sachanobi si configuré) et 83 apparences CobbleStar exportées des résolveurs livrés : Astéria, Nébélia, Éclipse, Alliance et créations. Les brouillons et les auteurs ne passent jamais par les routes publiques. Les espèces d’addons sans kit compatible restent nommées, avec un état « Visuel en préparation » ; aucun modèle générique ne remplace silencieusement leur apparence.

Le catalogue classique présente le modèle de base des espèces du serveur, pas toutes les transformations du jeu. Les chromatiques des variantes CobbleStar sont exportés. Les yeux Alpha et objets tenus ne sont pas comptés comme nouvelles fiches. Les rendus sont en pose fixe ; cette vue n’est pas une simulation des animations et effets du client Minecraft. La présence au catalogue ne garantit ni une capture ni un choix de starter disponible.

Recherche française sans accents, filtres de collection, tri, affichage progressif par 24, portraits calculés avec un seul contexte WebGL réutilisé. Le détail possède un deuxième contexte temporaire, des boutons de rotation/zoom, fermeture Échap et retour du focus. Les modèles sont chargés au passage à l’écran, sans boucle d’animation permanente. Les données publiées sont actualisées sous une minute.

Actualiser le manifeste depuis les assets embarqués : `node scripts/export-public-collections.mjs ../CobbleStar-mod`. Cet export génère également les SVG des jetons depuis leurs véritables faces et palettes du mod. Nova/Pulsar/Quasar disposent d’un onglet boutique, à l’unité et par quatre ; prix et identifiants de livraison conservés. Vote reste un jeton de récompense, sans nouveau prix inventé.

Console : les succès HTTP sont regroupés dans un bilan par minute ; réponses 4xx/5xx et requêtes de cinq secondes ou plus restent visibles. Les routes journalisées sont des modèles sans query string, corps ni identifiants de joueurs. La fréquence des synchronisations n’est pas modifiée. Le chargement de `economy.policy.json` est relatif au module, compatible avec le démarrage Kinetic depuis la racine du dépôt (ancienne cause de 503).

Validation : build Next/Astro/API, contrôles TypeScript du rendu, tests des routes et de la non-divulgation des brouillons, chargement de toutes les formes embarquées, tests du résumé de logs et du démarrage économique depuis la racine. Contrôle navigateur desktop/mobile à 390 px : recherche Dracolosse, détail Éclipse, rotation/zoom, Échap, retour du focus, montants des lots et absence de débordement horizontal.
