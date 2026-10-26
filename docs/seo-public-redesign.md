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
