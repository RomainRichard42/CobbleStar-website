# Pokémon Star : modèles des addons

## Mise en place

1. Installer le mod serveur CobbleStar 6.39.38, en conservant Cobblemon et les addons déjà utilisés. Redémarrer le serveur.
2. Déployer ensemble le site et l’API mis à jour, avec `api/star-addon-templates` (ou `star-addon-templates` dans l’archive Kinetic).
3. Exécuter `/pokemonstar sync`, puis vérifier `/pokemonstar status`.
4. Dans **Admin → Pokémon Star → Sans version Star**, chercher **Garde-de-Fer** ou **iron valiant**.
5. Télécharger le ZIP de base, ouvrir `ironvaliant.geo.json` et `ironvaliant.png` dans Blockbench. Recolorer aussi `ironvaliant_glow.png` pour ses parties lumineuses.
6. Réimporter les trois fichiers, enregistrer et publier. Les dossiers `reference` et `runtime` ne sont pas des géométries à importer.

Un kit installé ne publie rien et ne crée aucun spawn Star. Seule une publication admin active la variante, selon les règles existantes.

## Provenance et compatibilité

- Le catalogue serveur conserve les espèces officielles. Les addons ajoutent les espèces absentes ; ils ne remplacent pas silencieusement les squelettes officiels.
- Les modèles et poses sont lus dans le même addon. La version du fournisseur et les SHA-256 des fichiers modèle/poser doivent correspondre au kit du site.
- Deux addons déclarant la même nouvelle espèce bloquent sa publication ; aucun gagnant arbitraire n’est choisi.
- La publication embarque un modèle, un poser et des groupes d’animations avec des identifiants privés. Les ressources des Pokémon normaux ne sont pas remplacées.
- Les actions facultatives déclarées par un poser mais absentes de ses animations sont laissées au comportement par défaut de Cobblemon. Le kit les répertorie dans `addon.json` → `warnings`. Une animation manquante dans une pose requise bloque le kit.
- Les variantes utilisent la forme de base. Les formes alternatives sans base complète, atlas incompatibles et modèles dépassant les limites apparaissent comme kits à adapter.
- Le scanner lit les mods **installés sur le serveur**, pas les packs de ressources personnels des joueurs.

## Ajouter ou actualiser un addon

Depuis le dépôt du site, après vérification des droits des auteurs :

```powershell
npm.cmd run build:api
node scripts/export-star-addon-templates.mjs 'C:/chemin/addon.jar' --permission-confirmed --cobblemon 'C:/chemin/Cobblemon-fabric-1.8.0+1.21.1.jar'
node --test api/test/star*.test.mjs
npm.cmd run build:site
```

`--species ironvaliant` limite l’import à une espèce. Le générateur laisse les autres addons et les kits officiels intacts. Les ZIP qui ne figurent plus dans l’index ne sont pas servis.

Déployer l’API et les kits ensemble, puis la redémarrer pour recharger son index. Actualiser aussi l’addon serveur à la même version. Les anciennes publications restent en place tant qu’une nouvelle publication n’a pas abouti ; une incompatibilité bloque la nouvelle publication au lieu de remplacer le pack existant.

## Autorisation

L’administrateur a confirmé dans cette conversation, le 13 septembre 2026, disposer de l’accord des auteurs de Complete Cobblemon Collection pour modifier et distribuer ces modèles via son serveur. Les kits conservent la licence originale et identifient leur source ; cette confirmation ne change pas la licence publique du pack. Ne pas réutiliser ces autorisations présumées pour d’autres serveurs ou fournisseurs.

Les contrôles de compilation et d’assets ne constituent pas une validation visuelle de chaque Pokémon dans Minecraft.
