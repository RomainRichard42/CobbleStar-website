# SEO après la refonte publique — 26 octobre 2026

## Résultat livré

47 URL publiques contrôlées, dont 34 guides. L'audit en production ne détecte aucune erreur ni aucun avertissement sur son périmètre : réponses HTTP, titres, descriptions, H1, canonical, Open Graph, JSON structuré, dates du sitemap, liens et ancres, images, pages privées et vraies erreurs 404. Les pages du sitemap sont accessibles en deux clics au maximum depuis l'accueil.

Ce résultat ne signifie pas 47 pages indexées, une position garantie ou une certification des Core Web Vitals.

## Corrections

- Les liens GTS, raids, métiers, mondes et Pokémon Star de l'accueil ouvrent directement leurs guides. La présentation du serveur, la page Minecraft Pokémon et le parcours de connexion relient aussi les activités pertinentes.
- Titres des guides raccourcis et spécifiques ; description du wiki adaptée aux 34 guides. Métadonnées de boutique et de vote propres à chacune de ces pages : leurs anciens `og:url` pointaient sur l'accueil.
- Le wiki est une `CollectionPage` accompagnée de la liste des guides ; chaque article porte sa catégorie, son auteur identifié et sa date de modification, également visible pour le lecteur. Les champs Twitter sont explicités.
- Chaque guide conserve une date `modifiedAt` propre. Une publication CMS compare le contenu avec la version publiée : un contenu inchangé, un réordonnancement ou une date fournie dans un brouillon ne rafraîchit pas artificiellement cette date. Les anciens articles sans date connue restent sans date jusqu'à une véritable modification.
- Les dates individuelles alimentent le sitemap ; son horodatage ne dépend ni de la requête ni du build. Les URL existantes sont conservées.
- Les pages boutique et vote redirigent leurs variantes sans slash, `index.html` et le domaine `www` vers leur URL canonique. Les API et comptes conservent leur routage.
- Les anciens aperçus `/apercus/` reçoivent `X-Robots-Tag: noindex, nofollow`, comme les maquettes. Cette absence d'exclusion faisait partie des trois erreurs identifiées avant correction.
- Dimensions intrinsèques ajoutées aux images de l'accueil, avec conservation des proportions de la mascotte et du visuel de création. Pas de nouveau script de suivi ni de surcharge JavaScript.
- L'audit distingue maintenant les documents des ancres et supporte le wiki étendu avec des limites explicites. Il vérifie également Open Graph, les dates et l'accessibilité par les liens internes.

## Vérifications

Build API TypeScript et build Next + Astro réussis. 17 tests réussis : publication/dates, routes privées et publiques, sitemap, métadonnées, brouillons, contenu partagé et navigation. Contrôle visuel de l'accueil et d'un guide en largeur mobile 360 px ; pas de débordement horizontal constaté.

Rapports : `seo/reports/audit-2026-10-26-refonte-avant.json`, `audit-2026-10-26-refonte-local.json` et `audit-2026-10-26-refonte-production.json`.

## Mesure Google et suivi

Search Console n'avait pas encore de statistiques de recherche exploitables lors de cette intervention : rapport en cours de traitement. L'API PageSpeed a répondu HTTP 429 (quota), donc aucun score mobile ni résultat Core Web Vitals n'est annoncé. Les contrôles HTTP avec un User-Agent Googlebot ne remplacent pas une inspection Google réelle.

Le sitemap actualisé a été soumis avec confirmation de réception dans Search Console. Le suivi hebdomadaire existant reste actif le lundi à 10 h et utilise le plan de requêtes mis à jour, l'audit complet et les données Search Console lorsqu'elles deviennent disponibles. Une demande d'indexation n'est pas une preuve d'indexation effective.

Références :
- https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap
- https://developers.google.com/search/docs/appearance/structured-data/article
- https://developers.google.com/search/docs/appearance/title-link

Confirmation finale Search Console : la demande d'indexation de `/wiki/` a été acceptée (« URL added to a priority crawl queue »). L'état avant demande était « Discovered - currently not indexed ». Le tableau des sitemaps indique encore 18 pages découvertes, malgré les 47 URL effectivement servies et le nouvel envoi accepté. Ces deux nombres décrivent des états différents ; ne pas les présenter comme 47 pages déjà indexées.


## Revue des mots-clés et disponibilités — 27 octobre 2026

### Travail réalisé dans cette révision

- Répartition des intentions : l’accueil cible la recherche d’un serveur Cobblemon français ; `/minecraft-pokemon/` répond à la découverte du mod et au choix solo/serveur ; `/installer-cobblemon/` explique l’installation du pack officiel, les versions, le multijoueur et le dépannage. `/rejoindre/` garde le parcours spécifique à CobbleStar.
- Analyse qualitative des pages publiques PokeIsland, Poké Block et Tropimon ; références et décisions dans `seo/plan.json`. Aucun volume de recherche, score de difficulté ou rang Google n’a été inventé. Les mots « Minecraft » et « Pokémon » seuls ne constituent pas une priorité de lancement.
- Titre et introduction de l’accueil ajustés ; page Minecraft Pokémon enrichie de critères concrets pour choisir un serveur et de liens vers les systèmes correspondants. Les critères de boutique renvoient aux vraies conditions, sans promesse « sans pay-to-win ».
- Guide d’installation original avec étapes, tableau de dépannage, sources primaires et distinction explicite entre pack officiel, pack CobbleStar et serveur encore fermé. Pas de faux téléchargement du launcher.
- Liens contextuels depuis la page de découverte et l’accueil, lien permanent dans le pied de page Astro. Nouvelle URL intégrée au routage, au sitemap, à la canonicalisation et aux données structurées Article/BreadcrumbList. Dates éditoriales réelles transmises au schéma WebPage.
- PokéPark retiré du document wiki par défaut, de la catégorie, de la description du wiki, des commandes, des liens associés et du plan de mots-clés. Une politique de disponibilité corrige aussi les anciennes publications CMS au moment de leur lecture publique, sans modifier les brouillons conservés. L’ancienne URL renvoie 404 et sort du sitemap : pas de redirection vers un sujet sans rapport.
- Audit étendu : langue du document, viewport, canonical unique, absence de l’activité indisponible dans le HTML et l’API publique, 404 de l’ancien guide et redirections des pages principales.

### Vérifications et limites

Avant changements en production : 47 pages, 307 liens/ancres, 27 images, aucune erreur ou alerte dans l’audit technique existant. Après changements en local : 47 pages (dont 33 guides), 306 liens/ancres, 27 images, profondeur maximale de deux clics, aucune erreur ni alerte. Le total de pages reste stable : un guide retiré, une page d’installation ajoutée.

Build API et Next/Astro réussis ; 18 tests réussis, dont une ancienne publication CMS contenant l’activité retirée. Les premiers tests avaient été lancés avant la fin du build Astro ; ils ont été relancés après sa fin et passent tous.

Search Console n’a pas pu être consultée ce jour : navigateur intégré indisponible, puis contrôle Firefox bloqué par l’outil. L’API PageSpeed a répondu HTTP 429. Aucun classement, clic, impression, score Lighthouse ou Core Web Vitals n’est donc annoncé pour cette intervention. Le rendu mobile n’a pas été inspecté visuellement dans cette session ; les composants de lecture existants sont réutilisés.

État à la rédaction : changements vérifiés localement, déploiement Kinetic encore à effectuer. Le push du code ne prouve pas sa mise en ligne. Après redémarrage, relancer `scripts/seo-audit.mjs`, vérifier `/wiki/pokepark/` en 404 et `/installer-cobblemon/` en 200.

### Suivi utile

Le contrôle hebdomadaire déjà configuré utilisera l’audit renforcé. Consulter ensuite Search Console sur 28 jours comparés aux 28 précédents, France, Web, en séparant marque/hors marque et mobile/ordinateur. Prioriser les pages qui ont des impressions mais peu de clics, puis les requêtes auxquelles une page existante répond imparfaitement. Éviter de créer plusieurs pages presque identiques pour « FR », « français » et « francophone ».

Pour aller plus loin : vraies captures et gameplay du serveur, réponses aux questions réelles des joueurs, liens communautaires pertinents et informations d’ouverture exactes. Pas d’achat de liens ni de publication dans des annuaires sans instruction explicite.

Sources primaires supplémentaires :
- https://developers.google.com/search/docs/fundamentals/creating-helpful-content
- https://developers.google.com/search/docs/crawling-indexing/special-tags
- https://developers.google.com/crawling/docs/troubleshooting/http-status-codes
- https://modrinth.com/modpack/cobblemon-fabric
- https://support.modrinth.com/en/articles/8802250-modpacks-on-modrinth
- https://docs.fabricmc.net/players/installing-mods
