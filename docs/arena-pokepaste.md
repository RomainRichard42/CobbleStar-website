# Import Poképaste dans l’atelier des arènes

Dans **Admin → Arènes → Champion / Conseil / Maître → Équipe**, utiliser **Importer un Poképaste**, coller un lien `https://pokepast.es/<16 caractères hexadécimaux>` (ou le texte exporté depuis Showdown), puis **Analyser l’équipe**.

L’aperçu utilise le vrai catalogue du serveur sélectionné : espèces, formes, attaques, talents, natures et objets. Il affiche les Pokémon et chaque IV/EV avant remplacement. Une espèce ou forme absente n’est jamais remplacée par une autre. Les valeurs inconnues ou invalides bloquent l’import. Les noms anglais Showdown sont rapprochés des identifiants du registre, les labels traduits sont également reconnus ; un nom ambigu nécessite un identifiant complet.

Champs transférés : espèce/forme, niveau, genre, shiny, objet, talent, nature, quatre attaques maximum, six IV et six EV. Conventions Showdown : niveau omis = 100, IV omis = 31, EV omis = 0. Les limites restent celles des arènes : six Pokémon maximum, IV 0–31, EV 0–252 et total 510.

Les surnoms et les champs sans équivalent dans la configuration native (Tera Type, Happiness, Dynamax Level, Gigantamax, Pokeball, Hidden Power) sont signalés individuellement comme **non transférés**, avec confirmation explicite obligatoire. Une attaque Hidden Power typée non disponible dans le registre bloque la conversion : aucune déduction silencieuse d’IV. Un talent, une nature ou des attaques omis signalent le choix automatique du serveur.

**Remplacer l’équipe du brouillon** ne modifie ni le serveur ni les autres champions. L’annulation/rétablissement de l’éditeur fonctionne. Le remplacement est bloqué si l’équipe a changé depuis l’analyse. Il faut ensuite **Enregistrer**, puis **Publier en jeu** ; la validation native reste souveraine.

## API et sécurité

`POST /api/admin/arenas/:serverId/import-team` avec `{ "source": "<texte ou lien>" }` renvoie `{ team, errors, warnings, notes, source }`, sans écriture en base. Les erreurs de syntaxe font partie de l’aperçu HTTP 200 et bloquent le bouton de remplacement. Authentification administrateur en écriture et Origin identique au site obligatoires ; 12 analyses/minute ; réponse sans cache. Le catalogue est chargé depuis la base synchronisée, jamais depuis le client.

Le téléchargement externe utilise uniquement HTTPS vers `pokepast.es`, un identifiant hexadécimal de 16 caractères et `/raw`. Aucun port, paramètre, fragment, identifiant de connexion, hôte alternatif, redirection ou cookie n’est accepté. La résolution DNS IPv4 publique est vérifiée puis fixée pour la connexion (pas de deuxième résolution). Les adresses privées/spéciales sont refusées. Délai total DNS + HTTP : 8 secondes. Texte UTF-8 : 64 Kio maximum, y compris pendant la lecture en streaming. Le texte collé reste disponible en cas de panne de Poképaste.

Les transferts de synchronisation des arènes en fragments de 128 Kio sont inchangés.

## Vérification

```text
npm --prefix api test
npm run lint
npm run build
node scripts/test-arena-pokepaste-ui.mjs C:/chemin/vers/playwright/index.mjs
```

Le test navigateur charge le vrai site exporté, avec le vrai parseur et des routes/données de test isolées. Les captures `ui-review-arena-studio/pokepaste-preview-*.png` sont des rendus du site, pas des captures de jeu. Elles n’attestent pas d’un combat en production.

Références du format : [export/import officiel Showdown](https://github.com/smogon/pokemon-showdown/blob/master/sim/teams.ts), [route `/raw` officielle Poképaste](https://github.com/felixphew/pokepaste/blob/v3/server.go).
