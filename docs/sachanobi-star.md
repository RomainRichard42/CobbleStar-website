# Sachanobi Star

La variante Sacha appartient à `greninja`. Pas de nouvelle espèce, de spawn
indépendant, de talent ou de modification des statistiques.

## Déploiement et import

1. Déployer ce commit du site ET de l'API via le circuit Kinetic habituel.
   Aucun nouveau JAR CobbleStar ni migration SQL n'est nécessaire.
2. Clients : Complete Cobblemon Collection 2.1.0 doit fournir les ressources
   `cobblemon:ashgreninja.geo`, `cobblemon:ashgreninja` et le shuriken animé.
   Serveur/clients : Mega Showdown gère la transformation, pas ce pack.
3. Admin → Pokémon Star → `greninja` → Forme Sacha : importer
   `sachanobi-star.json` du kit Eclipse. Il contient uniquement les PNG en base64.
   Avec un brouillon Amphinobi existant, il est inutile de réimporter sa géométrie.
4. Enregistrer, cocher l'aperçu Sachanobi, puis publier Amphinobi.
5. Le pack unique distribue les deux apparences. Contrôler `/pokemonstar status`
   ou demander `/pokemonstar sync`. Le push Git seul ne publie pas le skin.

Un nouvel import de la forme normale conserve Sacha, sauf retrait explicite.
Le ZIP du brouillon/de la publication contient également `sachanobi-star.json`.
Les droits admin, la protection d'origine et les révisions concurrentes existants
s'appliquent aux deux formes ensemble. La publication reste transactionnelle.

## Transformation dans l'installation vérifiée

Vérifié dans Mega Showdown `1.0+1.8+1.21.1-release-hotfix` :

- utiliser la casquette de Sacha (`mega_showdown:ash_cap`) sur Amphinobi pour
  établir `battle_bond=bond` ; le minimum local configuré est 200 d'amitié ;
- atteindre AU MOINS 250 d'amitié pour la transformation ;
- en combat, mettre K.O. un adversaire avec une attaque, rester en vie et
  avoir encore un adversaire à combattre ;
- en dessous de 250, Battle Bond ne donne que des boosts, sans forme Sacha ;
- le changement applique `battle_bond=ash`, puis revient à `bond` à la réversion.

Source amont, également comparée au JAR installé :
https://github.com/yajatkaul/CobblemonMegaShowdown/blob/main/common/src/main/resources/assets/mega_showdown/showdown/abilities.js

La variante graphique exige simultanément `ash` et `cobblestar-star`.
La lignée doit donc déjà être Star ; la transformation ne donne pas la rareté.

## Validation / limites

Tests : restriction à Greninja, PNG 130×92/CRC, calque vide si absent, conservation
de la base, priorité 10001, combinaisons normal/shiny/Star/ash, modèle et poser CCC,
4 images animées du shuriken, réutilisation du nom `star_glow` pour remplacer le
calque UV de la base. Aucun remplacement de ressources normales ou de gameplay.

Le site affiche une géométrie en pose fixe, pas les animations de combat.
La transformation, les shaders et la réception par le serveur live restent à
tester en jeu. Le catalogue actuel n'atteste pas la présence de chaque forme
chez chaque client : la dépendance CCC 2.1.0 est explicitement requise.

Assets CCC : licence jointe ; utilisation avec l'accord des auteurs déclaré
par l'administrateur du serveur.
