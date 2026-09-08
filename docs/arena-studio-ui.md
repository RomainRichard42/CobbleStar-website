# Atelier des arènes — interface admin

Page : `/admin/arenes/`, accessible depuis le centre de contrôle et le studio Quêtes & PNJ. Les données sont privées ; la page statique ne contient aucun nom de joueur, catalogue ou secret. Les requêtes utilisent la session Discord existante et les autorisations de l’API.

## Utilisation

1. Choisir le serveur ayant synchronisé son module d’arènes.
2. Choisir l’une des huit arènes ou l’une des cinq étapes de Ligue.
3. **Champion** : nom, nom de l’arène, modèle PNJ enregistré, stratégie et niveau conseillé. Changer le niveau conseillé ne change pas silencieusement les niveaux des Pokémon déjà présents.
4. **Équipe** : 1–6 Pokémon, recherche par nom/identifiant dans les registres réels, forme, niveau, shiny, sexe, nature, talent, objet, quatre attaques maximum, IV et EV. Les valeurs automatiques sont explicites. Les équipes peuvent être dupliquées membre par membre et réordonnées.
5. **Récompenses** : bonus de première victoire en CobbleCoins, points XP Minecraft et jusqu’à huit objets. Le badge/la progression de Ligue reste automatique et non retirable.
6. **Dresseurs** : six emplacements prédéfinis autour du terrain, nom, modèle, stratégie, équipe et récompenses individuelles. Un dresseur peut être facultatif ou obligatoire avant le champion. Le masquer retire son caractère obligatoire. Renommer conserve son identifiant et l’historique de première victoire.
7. **Enregistrer** sauvegarde un brouillon ; **Publier en jeu** demande un motif de 3 à 300 caractères et une confirmation. Attendre l’accusé du serveur « Appliqué en jeu ». Le bouton utilise `hasUnpublishedChanges` fourni par l’API : les compteurs de sauvegarde et de publication sont indépendants, ils ne permettent pas à eux seuls de savoir si le contenu a changé.

Actualiser le statut ne remplace jamais les changements locaux. Une révision concurrente suspend sauvegarde/publication et propose un rechargement explicite, confirmé si le brouillon local est modifié. Annuler/rétablir conserve jusqu’à 20 changements locaux. Une fermeture avec des modifications déclenche l’avertissement du navigateur.

Avant la première publication, le statut indique « Configuration serveur importée », pas « Appliqué en jeu ». Les compteurs du vrai état serveur signalent les récompenses encore en attente et les livraisons nécessitant un contrôle lorsqu’ils dépassent zéro. Une zone pas encore prête et des sessions actives sont signalées séparément. Si le dernier contact est ancien, les informations sont explicitement datées ; aucun état d’exécution n’est inventé à partir d’un simple enregistrement de brouillon.

La carte des six emplacements est un schéma fonctionnel, explicitement signalé comme tel ; ce n’est pas un faux aperçu du bâtiment. Elle respecte les ancrages du mod : slots 0/1 au fond côté champion (`z - 10`), 2/3 au milieu et 4/5 devant côté entrée (`z + 10`). L’ordre de rendu va de 0/1 en haut vers 4/5 en bas. Les illustrations Pokémon réutilisent `PokemonPortrait` du panneau joueurs (source PokeAPI/official artwork). Elles ne prétendent pas être des captures Cobblemon : une forme non reconnue ou un chargement impossible donne un état indisponible, jamais une image d’une autre espèce. Les champs de forme proviennent de `catalog.species[].forms` du serveur. Aucun catalogue de Pokémon fictif n’est embarqué dans la page.

## Identité visuelle

Audit : le site dispose de `app/design-system.css` (fond `#080616`, surfaces `#141027` / `#1D1737`, violet `#745BD3`, nuage `#8EDFF3`). Certains anciens panneaux redéfinissent des violets et CTA jaunes en dur. Cet atelier reprend les tokens de marque sans ajouter un thème parallèle : grille 4 px, rayons 12/18/28 px, texte d’aide au moins 14 px, corps 16 px, CTA violet. Police réelle du site : Segoe UI/Inter via `--cs-font-body`, et non une promesse de Rubik non chargée. Le Dracolosse provient du logo public existant. Aucun backdrop blur animé ou animation permanente coûteuse n’est ajouté.

## Tests réalisés

```powershell
npm.cmd run build:site
node scripts/test-arena-studio-ui.mjs C:/chemin/vers/playwright/index.mjs
```

Le script sert **les vrais fichiers exportés dans `out/`** et intercepte les requêtes API avec des fixtures locales isolées. Il valide également les données produites par les formulaires contre le vrai schéma de l’API et son contrôle des catalogues. Couverture : 13 étapes, formulaires, recherche dans 222 espèces de test, duplication, IV/EV, récompenses, dresseurs facultatifs/obligatoires, emplacements uniques, sauvegarde puis publication/accusé, conflit, conservation du brouillon, droits de lecture/refus, focus du dialogue et absence de débordement à 320/390/768/1024/1440 px. Les images externes sont volontairement bloquées dans ce test pour vérifier l’état indisponible.

Captures de test : `ui-review-arena-studio/desktop-team.png`, `desktop-trainers.png`, `mobile-trainers-diagram-viewport.png` et `mobile-trainers-fields-viewport.png`. Ce sont des preuves de rendu du véritable site avec données de test, pas des captures de production ni des preuves de fonctionnement des combats en jeu.

La première capture mobile pleine page (`mobile-trainers.png`), prise après plusieurs redimensionnements d’un contexte desktop Chromium, comporte des zones non peintes hors viewport et **ne doit pas servir de validation visuelle**. Ce défaut de capture n’a pas été reproduit dans un vrai contexte mobile tactile (`isMobile`, `hasTouch`, 390×844, DPR2) après défilement effectif. Les deux captures `*-viewport.png` ont été inspectées : le diagramme et les champs sont entièrement peints dans le viewport, aucun grand blanc. Le test édite également le nom du dresseur et sa condition obligatoire et vérifie qu’aucun ancêtre des champs n’est masqué. Aucun changement CSS global n’a été apporté pour maquiller le diagnostic.

Ces tests ne remplacent pas la validation serveur Minecraft des combats, récompenses, placements ou migration de progression. Aucune publication distante n’est effectuée par ce script.
