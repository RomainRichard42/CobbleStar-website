Annonces GTS Discord

Déployer cette API avant le mod qui envoie le champ listing : l'ancienne API
rejette ce champ. Les événements des anciens mods restent acceptés et sont
présentés en encadré sans identifiant d'annonce ni préfixe technique.

Importer cs_pokemon.png et cs_item.png comme émojis du serveur en conservant
ces noms exacts, puis redémarrer le bot. Les fichiers SVG sont leurs sources
dessinées en code. Sans ces émojis, le bot utilise des émojis Unicode.

Les nouvelles annonces structurées indiquent le type (pokemon/item), le prix,
la quantité, le vendeur et l'échéance réelle en millisecondes Unix. Discord
affiche la date dans le fuseau du lecteur et le temps restant.

Le format accepte les enchères (mode auction) avec une échéance obligatoire.
La version GTS récupérée ne produit actuellement que des ventes fixes :
le support de présentation ne crée pas un système d'enchères dans le jeu.

Les messages déjà publiés restent inchangés. Aucun changement de compte,
de token ou de permissions du bot n'est nécessaire pour cette présentation.

Validation : compilation TypeScript et 10 tests Discord réussis ; compilation
Java du pont mod réussie dans la reconstruction locale 6.50.6.
