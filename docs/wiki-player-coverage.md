# Wiki joueur — couverture du 26 octobre 2026

Le document partagé `wiki.default.json` contient 34 guides et 8 catégories. Il est lu par le rendu public Astro, l'éditeur existant et l'intégration du wiki en jeu. Les cinq anciennes URL restent valides. Aucun accès administrateur n'est modifié.

## Sources et portée

`wiki-sources.json` associe chaque guide aux fichiers consultés : `mod:` désigne le dépôt CobbleStar-mod ; `site:` désigne ce dépôt. Le contenu est établi depuis le code et les documents du projet, sans validation de chaque mécanique sur une instance Minecraft en fonctionnement.

La recherche indexe titres, résumés, tags, commandes, paragraphes et FAQ. Les parcours et liens associés sont filtrés sur les articles réellement publiés. Les articles utilisent les blocs déjà reconnus par le wiki partagé.

## Corrections de règles anciennes

- Pension native `/pension`, sans présenter DayCare+ ni Mirror Herb comme moteur actuel.
- Épreuves via `/epreuves`, au pluriel ; Ranked auprès du responsable, pas via des commandes de test.
- Équipes Ranked aux niveaux réels ; équipe de Ligue verrouillée pendant la tentative.
- Raids via la StarWatch, `/warp raid` et le guide, pas via les sous-commandes réservées au système.
- GTS à prix fixe ; aucune enchère annoncée sans implémentation vérifiée.
- Deux séries de cartes dans le catalogue actuel ; aucune troisième série inventée pour satisfaire une condition de grade.
- Six métiers actifs ; anciennes professions désactivées exclues.
- Les tags suivent le document récent des grades (un ou deux tags), plutôt que les anciennes instructions du README.

## Valeurs et disponibilités à confirmer dans la configuration d'exploitation

Les prix, quotas, probabilités, délais et récompenses modifiables renvoient aux interfaces en jeu. Les recettes de galerie, les six métiers et les principaux parcours correspondent aux sources enregistrées.

Les organisations sont désactivées par défaut : leur guide précise la dépendance à l'ouverture des candidatures. Les entrées des anciens donjons sont désactivées ; elles ne sont pas présentées comme une activité disponible. WonderTrade a été retiré. Les espèces réservées au staff et les commandes administrateur ne sont pas publiées dans les exemples joueur.

Point à régler avant ouverture : les conditions de grades peuvent demander trois séries de cartes alors que le catalogue documenté n'en contient que deux. Le guide explique comment signaler une condition indisponible et ne promet pas un déblocage inexistant.

Le serveur n'est pas encore ouvert publiquement et le launcher reste indisponible. Les illustrations proviennent des ressources Cobblemon déjà présentes ; ce ne sont pas des captures du serveur.

## Publication

Avant déploiement, `/api/wiki` renvoyait `version: 1`, `updatedAt: null` et cinq articles : aucune publication en base ne remplaçait le document par défaut. La mise à jour du fichier suffit dans cet état. Ne jamais écraser un document publié par l'équipe pour forcer l'apparition du fichier par défaut.

## Vérification

- Build Next + Astro et tests des routes publiques, métadonnées, sitemap, brouillons et accès privés.
- Validation des identifiants, anciens liens, médias locaux et exemples de commandes.
- Inspection navigateur de la recherche multi-mots, des FAQ et des sommaires ; vues mobiles de 360 et 390 px.
- Les boutons publics gardent une forme rectangulaire avec des coins de 10 px selon la correction demandée.


## Correction de disponibilité du 27 octobre 2026

Le propriétaire confirme que PokéPark n’est pas disponible et ne doit pas être présenté. Le wiki courant contient désormais 33 guides. La catégorie devient « Mondes & exploration » et les mentions dans la capture et les commandes sont corrigées. Le filtre de disponibilité protège également le rendu Astro, l’API publique et le wiki en jeu contre une ancienne publication en base. Les brouillons enregistrés ne sont pas écrasés. Tests de non-régression dans `api/test/wiki-availability.test.mjs` et `scripts/test-public-site.mjs`.
