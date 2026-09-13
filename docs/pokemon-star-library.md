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
