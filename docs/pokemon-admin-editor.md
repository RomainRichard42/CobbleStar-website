# Éditeur Pokémon — panneau joueurs

Les formulaires utilisent les relevés signés de la passerelle serveur. Ils n’écrivent pas dans une sauvegarde Minecraft depuis le navigateur.

## Installation

Déployer le site **et** l’API issus du même build, puis remplacer le JAR CobbleStar serveur par le nouveau `build/libs/cobblestar-6.19.0.jar` du dépôt Minecraft. Ne pas laisser deux versions du mod dans `mods/`. La configuration privée existante `cobblestar-admin-bridge.json` doit rester activée. Aucun nouveau secret n’est nécessaire. Redémarrer le serveur, connecter le joueur, attendre son relevé et ouvrir `/admin/joueurs/`, onglet Pokémon.

Un ancien JAR reste compatible en lecture et propose seulement l’ancienne action de niveau. La capacité `pokemon_edit` doit être annoncée par le serveur pour activer les nouveaux contrôles.

## Paramètres disponibles

- Espèce, surnom, chromatique, sexe, niveau et expérience.
- Six IV, six EV (252 par stat / 510 total) et entraînement ultime (IV effectifs distincts des IV héritables).
- Nature, nature de menthe, talent, bonheur.
- 1–4 attaques distinctes, PP et PP Plus.
- PV, altération persistante, soin complet.
- Objet tenu, Ball de capture, type Téracristal, niveau Dynamax, facteur Gigamax, échelle visuelle et autorisation d’échange.

Les identifiants d’espèces, talents, attaques, objets, Balls, natures et statuts sont vérifiés dans les registres du serveur. Le remplacement d’un objet tenu retire l’ancien sans le donner au joueur. Les talents sont forcés explicitement, comme intervention administrateur. Une modification d’espèce ou de niveau peut recalculer d’autres caractéristiques via Cobblemon.

## Limites explicites

Les caractéristiques de combat calculées ne sont pas des valeurs arbitraires : elles découlent du niveau, de l’espèce, de la nature et des IV/EV. UUID, propriétaire, coordonnées PC/équipe, formes pilotées par les features, marques, évolutions en cours et données propres aux extensions restent en lecture brute. Ce panneau ne prétend donc pas modifier absolument chaque propriété interne d’un Pokémon.

Les images sont les illustrations publiques Pokémon distribuées par [PokéAPI](https://github.com/PokeAPI/sprites), pas un rendu 3D Cobblemon. L’appel externe n’envoie que l’identifiant d’espèce/forme, sans session, nom de joueur, surnom ou UUID. Cache des métadonnées en mémoire et cache HTTP ; chargement paresseux des images. Variante shiny lorsqu’elle existe, correspondances régionales explicites, absence affichée en cas de forme personnalisée/inconnue ou de panne. Aucune substitution shiny vers normal.

## Sécurité et validation en jeu

Le joueur doit être connecté, vivant, hors combat, et le Pokémon rappelé. Chaque champ passe par une proposition, un motif obligatoire et une confirmation. L’API puis le serveur comparent une empreinte des valeurs éditables. Toute modification concurrente impose de recharger le relevé. Une seule intervention peut être en attente par joueur.

Le serveur utilise les setters Cobblemon et notifie le stockage. Les sauvegardes avant/après sont conservées dans le journal existant. Le résultat est revérifié après mutation : une règle d’un autre mod qui ajuste ou annule le changement ne doit pas être présentée comme un succès. Une exception après début de mutation produit un résultat `unknown`, à inspecter avant de réessayer.

Tests locaux : API (règles, droits, file d’actions), navigateur sur le véritable export avec données synthétiques (IV/EV, confirmation, brouillon périmé, mobile), compilation et empaquetage du JAR. **Pas de validation Minecraft en exécution dans ces tests.** Sur le serveur de test, vérifier une modification dans l’équipe puis dans le PC, attendre « Appliquée », ouvrir le résumé Cobblemon, puis redémarrer et vérifier la persistance. Tester aussi les refus hors ligne/en combat et une intervention interceptée par un autre mod.
