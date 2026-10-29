# Carnet Atlas

`/collection/` est une page Astro séparée du Pokédex public, accessible depuis le compte, le Pokédex et les fiches d’espèce. Elle est noindex et no-store. Son HTML ne contient que le catalogue public ; les données privées arrivent par `/api/me/collection`, avec la session existante.

Le catalogue et la disponibilité Star sont lus à chaque requête depuis `getDex`. Le fichier `collection-species.json` fournit uniquement les types et numéros du catalogue déjà extrait des données du jeu. Aucune possession de démonstration n’est livrée.

## Données et objectifs

- Possession actuelle dans l’équipe et le PC, dédupliquée par UUID, agrégée par espèce. Ce n’est pas un historique des captures.
- Star comptés à partir du marqueur CobbleStar du JSON de sauvegarde déjà synchronisé : `PersistentData.cobblestar_star` (booléen ou byte) ou `ForcedAspects` contenant exactement `cobblestar-star`.
- Favoris, quantité, chromatique ou Star, note et état `plan`/`active` enregistrés en base. Une chasse par espèce ; Star et chromatique sont des choix exclusifs.
- Sans première synchronisation, les possessions sont inconnues. Un relevé partiel désactive « Manquants » et n’affirme pas l’absence d’une espèce non observée.
- Les préférences existantes sont conservées par la migration additive `022_collection_atlas.sql`. Les sauvegardes d’anciens clients sans les nouveaux champs les préservent.
- Pas de cache local des données privées ; contrôle du compte avant sauvegarde, effacement à la déconnexion, protection contre les réponses d’un compte précédent.

Les clés de sérialisation Cobblemon sont définies dans [DataKeys.kt](https://gitlab.com/cable-mc/cobblemon/-/blob/main/common/src/main/kotlin/com/cobblemon/mod/common/util/DataKeys.kt). Le mod CobbleStar utilise déjà `Pokemon.saveToJSON` dans `PlayerAdminBridge` : cette fonctionnalité ne demande pas de nouveau JAR.

## Vérification

Tests API de projection Star, disponibilité publique, session/origine, compte propriétaire et absence de données de sauvegarde brutes. Tests du client sur enregistrement, échec, expiration et changement de compte pendant une requête. Tests Astro sur routage, noindex/no-store, catalogue sans données personnelles et liens depuis le Pokédex.

Le serveur local de contrôle visuel et ses possessions fictives restent hors du dépôt et de l’application publiée.

## Affichage sobre par défaut

Les modèles de la collection, du Pokédex, des fiches et de l’accueil sont figés dans leur pose Cobblemon au chargement. Les animations ne démarrent que sur demande. Atlas conserve le rendu de chaque canvas immobile et ne le redessine pas en boucle.

Icône Équipe & PC : PC Cobblemon, fichier original inchangé du wiki officiel : https://wiki.cobblemon.com/index.php/File:PC.png (https://wiki.cobblemon.com/images/8/89/PC.png).
