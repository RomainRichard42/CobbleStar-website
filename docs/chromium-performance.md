# Portraits et fluidité Chromium

## Corrections

- CSP de l’API : autoriser les métadonnées `https://pokeapi.co` et les images sous `https://raw.githubusercontent.com/PokeAPI/sprites/`. Pas d’autorisation globale de tous les domaines. Les tests navigateur utilisent désormais cette même configuration Helmet, et peuvent tester le vrai service avec `TEST_POKEMON_ART=1`.
- Curseur : un maximum d’une mise à jour par frame, transformation locale du curseur au lieu de variables CSS héritées depuis `html`, suppression du halo de 520 px en mélange `screen` et des animations `left/top`. Logo et interactions hover/clic conservés.
- Progression du scroll : transformation locale de la barre, hauteur du document mise en cache via ResizeObserver, pas de variables héritées à chaque scroll.
- Menu fixe : fond presque opaque à la place du flou d’arrière-plan et suppression de la réduction d’échelle au scroll. Palette, liens et survols conservés.
- Roadmap : transformations locales pour la caméra et le HUD, scènes lointaines masquées pendant le parcours puis réaffichées pour le zoom final. Suppression du parallaxe à la souris ; le déplacement par étapes, la lecture mobile et le tracé restent en place.
- Callbacks du curseur annulés lors du démontage, de la sortie du pointeur et du passage en arrière-plan. Respect du pointeur tactile et des animations réduites.

## Mesures locales

`scripts/profile-chromium.mjs <playwright/index.mjs> before|after` exécute deux secondes de mouvements puis deux secondes de scroll sur l’accueil, la boutique et la roadmap. Mesures via Chrome DevTools Protocol dans Chromium headless, même poste et viewport 1440 × 1000.

| Travail | Recalcul des styles avant | Après |
| --- | ---: | ---: |
| Accueil / pointeur | 1 245 ms | 22 ms |
| Boutique / pointeur | 1 110 ms | 11 ms |
| Roadmap / pointeur | 1 063 ms | 31 ms |
| Accueil / scroll | 1 675 ms | 21 ms |
| Boutique / scroll | 861 ms | 16 ms |
| Roadmap / scroll | 1 444 ms | 28 ms |

Ce sont des mesures du travail CPU de ce scénario, **pas** une garantie de FPS sur tous les GPU, extensions ou modes économie d’énergie de Chrome/Edge/Opera. Les rapports détaillés générés sont dans `ui-review-performance/` (ignorés par Git).

## Déploiement

Déployer le nouveau site **et** l’API, puis redémarrer l’API : le changement CSP est un en-tête serveur. Aucun nouveau JAR Minecraft n’est nécessaire pour ces correctifs. Recharger ensuite la page admin et vérifier une illustration normale et shiny. Les formes personnalisées sans illustration publique restent indiquées comme indisponibles.
