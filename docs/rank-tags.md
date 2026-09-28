# Tags de rang — intégration du 28 septembre 2026

## Périmètre

Demande : lire la hiérarchie et intégrer `PackTagComplet.zip` au téléchargement automatique du serveur, en plus des ressources existantes. Le PDF est une spécification de rangs : ses listes de permissions ne sont **pas** des commandes à exécuter. Cette livraison n'accorde aucun droit OP, aucune permission, aucun abonnement, aucun rang et ne modifie pas les préfixes des joueurs.

Sources lues : les cinq pages de `Hiérarchie des Rangs [Permissions à faire].pdf` et le ZIP fourni. Les 17 PNG sont conservés byte-for-byte, avec leurs crédits **LarkAvery**. Les 16 codes du pack sont conservés. `ranger.png` était présent mais absent de la police : ajout de **U+E017**, comme demandé dans le PDF. Les variantes A/B sont conservées comme deux dessins alternatifs, pas fusionnées.

## Hiérarchie du document

- Staff : Admin, Modo, Guide. Le document demande des permissions distinctes (Admin : OP, sanctions et remboursement ; Modo : bannissement jusqu'à 7 jours et modération ; Guide : mute écrit temporaire, avertissements et historique). **Rien de cela n'est appliqué par un pack graphique.**
- Progression gratuite : **Recrue → Éclaireur → Aventurier → Prodige → Vétéran → Gardien → Élite OU Mercenaire**. Élite/Mercenaire est un choix de titre au dernier palier, pas deux paliers successifs.
- Abonnements : Étoile, Cosmique A/B, Galactique A/B, achetés en Starcoins. Leurs cosmétiques doivent être activables dans le Cosmodex.
- Métier : Ranger au niveau maximal du métier.
- Non disponibles dans le document : Champion, Ligue, Maître, Builder. Aucun tag ni grade inventé pour eux.
- Emplacements prévus : chat, TAB, au-dessus du joueur et carte de dresseur. Le pack fournit les glyphes ; le code/formatage de chacun de ces emplacements doit ensuite utiliser le préfixe du joueur. **L'intégration du pack seule ne les attribue pas automatiquement.**

### Progression gratuite à configurer séparément

| Rang | Conditions du PDF | Avantages décrits |
|---|---|---|
| Recrue | Nouveau joueur | 3 homes, kit Recrue |
| Éclaireur | 24 h de jeu, 3 raids, membre d'une guilde | `/back`, kit |
| Aventurier | 8 Épreuves, 25 votes, items fonctionnels débloqués via quêtes | 5 homes, +2 slots GTS, kit |
| Prodige | Ligue battue, 10 Ranked, 5 explorations | `/repair` toutes les 6 h, `/hatch`, kit |
| Vétéran | Pokédex complet, 10 explorations, 50 votes | 10 homes, +3 slots GTS, `/pokeheal`, kit |
| Gardien | 3 séries de cartes, 50 raids, invocation d'Arceus via quêtes | `/hatch all`, `/pc`, kit |
| Élite / Mercenaire | Rang Ranked Master minimum, 30 explorations, chapitres Histoire terminés | 25 homes, +5 slots GTS, kit du choix |

Les montées demandent également un paiement en Cobblecoins, mais les montants sont `xxx` dans le PDF ; `100 000 ?` pour Éclaireur est une suggestion, pas un tarif validé. Ne pas les deviner. Le caractère cumulatif ou total des bonus GTS et les règles d'héritage restent à préciser avant implémentation.

Abonnements selon le PDF : commandes F2P débloquées et kit du rang pour tous ; Étoile : 30 homes et cosmétique étoilé ; Cosmique : 50 homes, `/fly`, cosmétiques étoilé + cosmique ; Galactique : homes illimités, `/fly`, les trois cosmétiques avec personnalisation RGB étendue aux Pokémon. Ne pas transformer ce résumé en règles de boutique sans configuration explicite.

## Table des glyphes

| Tag | Code Unicode | Caractère à copier |
|---|---|---|
| Admin | U+E001 |  |
| Modo | U+E002 |  |
| Guide | U+E003 |  |
| Recrue | U+E004 |  |
| Éclaireur | U+E005 |  |
| Aventurier | U+E006 |  |
| Prodige | U+E007 |  |
| Vétéran | U+E008 |  |
| Gardien | U+E009 |  |
| Élite | U+E010 |  |
| Mercenaire | U+E011 |  |
| Étoile | U+E012 |  |
| Cosmique A | U+E013 |  |
| Cosmique B | U+E014 |  |
| Galactique A | U+E015 |  |
| Galactique B | U+E016 |  |
| Ranger | U+E017 |  |

Ce sont des valeurs **hexadécimales** : E010 n'est pas E00A. Les cases vides dans un éditeur hors Minecraft sont normales.

## Chargement sans installation manuelle

1. Les assets versionnés de `api/rank-tags` sont ajoutés par `appendRankTags()` à chaque `buildStarPack()`. La police est `cobblestar_planets:ranks`, avec une référence ajoutée à `minecraft:default`. Les lettres vanilla et les autres ressources ne sont pas remplacées.
2. Après déploiement/redémarrage de **l'API du site**, la première synchronisation authentifiée du serveur reconstruit la publication avec les Pokémon **déjà publiés**, les FX, interfaces et formes régionales existantes, puis les tags. Les brouillons Star restent des brouillons.
3. Le mod serveur existant récupère le nouveau SHA-1 lors de sa synchronisation (cycle de 600 ticks), demande le pack obligatoire aux joueurs connectés et l'envoie aux nouvelles connexions. Sans nouvelle modification, ZIP et hash restent identiques : pas de retéléchargement inutile.
4. Aucun nouveau JAR client/serveur requis pour cette intégration purement graphique. Il faut néanmoins déployer l'API modifiée ; recharger la page du navigateur ne déploie pas le serveur du site. Dépend du bon fonctionnement de la passerelle déjà configurée.

Les sous-polices existantes peuvent utiliser le même code privé sans collision si elles gardent leur propre identifiant. Les badges de cette livraison utilisent leur police dédiée. Un autre pack prioritaire réutilisant les mêmes codes dans `minecraft:default` peut prendre le dessus : utiliser explicitement `cobblestar_planets:ranks` lorsque le formatage le permet.

Le pack ne transforme pas le texte littéral `e001` en badge. Il faut envoyer le caractère Unicode, sans gras ni recoloration (couleur blanche pour préserver les PNG). Pour un test visuel administrateur, après chargement du pack :

```mcfunction
/tellraw @s [{"text":"Tags : ","color":"white"},{"text":"\ue004 \ue005 \ue006 \ue007 \ue008 \ue009 \ue010 \ue011 \ue012 \ue013 \ue014 \ue015 \ue016 \ue017","font":"cobblestar_planets:ranks","color":"white"}]
```

## Validation

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/import-rank-tags.ps1 -ZipPath 'C:\Users\lolil\Downloads\PackTagComplet.zip'
npm.cmd --prefix api run build
node --test api/test/rank-tags.test.mjs api/test/star-assets.test.mjs api/test/star-effects.test.mjs api/test/star-effects-publication.test.mjs
```

Le manifeste conserve le SHA-256 du ZIP source et de chaque PNG. Les tests contrôlent les 17 codes, les textures, les références de police, les conflits, la conservation des autres ressources et l'inclusion Kinetic. Ne pas utiliser un export `buildStarPack([],[])` comme remplacement manuel d'un pack serveur contenant des Star : il sert aux tests locaux ; la vraie publication serveur récupère les espèces publiées en base.

Validation locale : compilation API réussie ; suite complète de 113 tests, dont 111 réussis et 2 ignorés, aucun échec. Comparaison du pack partagé avant/après : 258 fichiers conservés à l'identique, 20 ajouts, aucune suppression ni modification des ressources existantes.

État : intégration locale prête à déployer. Aucun test visuel Minecraft ni publication distante effectué.
