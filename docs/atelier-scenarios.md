# Écrire une aventure CobbleStar

L’atelier se trouve dans **Administration → Quêtes & PNJ** (`/admin/creation/`). Il est destiné aux auteurs : les noms suffisent, aucune commande ou clé technique n’est à écrire.

## 1. Inventer un personnage

Ouvre **Personnages**, puis **Créer un personnage**. Dans **Identité**, donne-lui un nom unique et le rôle **Proposer des aventures**. Ce nom sera aussi utilisé en jeu avec le bâton. Choisis sa couleur et son apparence ; les apparences personnalisées existantes sont conservées, l’ajout de nouveaux skins au pack reste un travail de l’équipe technique.

## 2. Poser l’histoire

Ouvre **Histoires → Créer une histoire → Introduction**. Donne-lui un titre et un pitch. Choisis si elle fait partie de l’histoire principale ou si c’est une aventure secondaire. Désigne le personnage qui la propose, ou un démarrage automatique. Les prérequis permettent d’enchaîner plusieurs histoires.

Les chapitres servent à ordonner les histoires principales. Une aventure secondaire ne bloque pas la fin du chapitre précédent.

## 3. Dessiner le chemin du joueur

Dans **Scénario**, chaque carte est une étape. Clique sur la carte pour modifier sa consigne et ses conditions. La bibliothèque **Que se passe-t-il ensuite ?** propose 31 actions : rencontres, captures, évolutions, éclosions, fossiles, combats, exploration, fabrication, pêche, commerce, minage et raids.

Exemple :

1. Capturer un Pokémon → choisir Évoli → consigne « Trouver un nouvel ami ».
2. Explorer un lieu → choisir un biome et/ou un monde.
3. Parler à un personnage → choisir le professeur → consigne « Lui raconter ta rencontre ».

Les objets, espèces, blocs, biomes, mondes et créatures sont sélectionnés dans les listes réellement transmises par le serveur. Utilise la recherche par nom, sans inventer d’identifiant. Si les listes sont absentes, l’équipe technique doit mettre à jour la passerelle serveur.

**Dans l’ordre du scénario** : seules les étapes atteintes progressent. Une action faite trop tôt ne compte pas ; un événement ne peut pas faire avancer deux étapes successives à la fois. **Objectifs en liberté** : les objectifs progressent en parallèle. Une étape bonus ne bloque pas la suite. Les anciens scénarios conservent leur mode parallèle.

**Monter**, **Descendre** et **Dupliquer** permettent de réorganiser. **Annuler la modification** et **Rétablir** gardent les vingt dernières modifications locales (réinitialisées au rechargement).

## 4. Écrire les conversations

Dans **Personnages → Conversations**, sélectionne une réplique, écris ce que dit le PNJ et ajoute les réponses possibles. **Écrire la suite et la relier** crée la scène suivante et la réponse qui y mène.

Une réponse peut mener à une autre réplique, terminer la conversation ou accepter une histoire proposée par ce personnage. La réplique d’ouverture habituelle se choisit avec **Utiliser en ouverture**.

Pour une réaction qui évolue, ouvre **Adapter l’ouverture à la progression du joueur**. Choisis l’histoire, puis :

- Disponible, pas encore acceptée.
- En cours, éventuellement à une étape précise.
- Objectifs terminés, récompense à récupérer.
- Terminée et récompense récupérée.

Les conditions sont évaluées par le serveur au début de l’interaction, avant de compter la rencontre. La première scène correspondante dans la liste devient l’ouverture. Sinon, l’ouverture habituelle est conservée. Ces conditions choisissent le début du dialogue ; elles ne masquent pas les réponses d’une conversation déjà ouverte. Pour un dialogue évolutif, laisse les conversations répétées activées.

## 5. Composer la récompense

Dans **Histoires → Récompenses**, choisis **Un objet**, **Points d’expérience** ou **Niveaux d’expérience**, puis la quantité. Tu peux proposer jusqu’à quatre récompenses au choix. Le système crée lui-même les actions autorisées ; il n’expose pas de console.

## 6. Relire, enregistrer, publier

**Relecture** signale les éléments manquants et permet de parcourir les étapes. **Répétition** permet de cliquer dans les dialogues. Ce sont des outils de relecture, pas des aperçus Minecraft ni des tests sur un vrai joueur.

**Enregistrer** garde un brouillon, y compris lorsqu’il reste des rencontres ou branches à compléter. **Publier en jeu** vérifie les liaisons, les conditions, les objets disponibles et demande un motif. Rien n’est appliqué avant confirmation. Attends **Serveur à jour**, puis teste en jeu avec un compte joueur.

Le bâton reste celui du mod : `/queteadmin baton`. Saisir le nom du personnage et enregistrer suffit pour le lier. Les modifications suivantes suivent cette liaison, même après un renommage.

## À savoir

- Il n’y a plus de quêtes quotidiennes, hebdomadaires ou mensuelles. Les anciennes sont retirées du journal et de l’atelier ; leurs données de progression restent archivées sans réinitialisation. Les réglages du battlepass ne sont pas concernés.
- Une histoire déjà commencée doit être **dupliquée** avant de changer son ordre, ses conditions, son mode de progression ou ses événements. Les joueurs ne perdent pas leurs anciennes progressions.
- Les événements se produisent après l’acceptation et l’arrivée à l’étape : ce n’est pas une vérification rétroactive des actions passées. La connexion du joueur est une exception reconnue à l’acceptation auprès d’un PNJ.
- La rencontre d’un PNJ signifie une interaction, pas la lecture de toutes ses répliques. Si la première étape demande de reparler au PNJ donneur, une nouvelle interaction après acceptation est nécessaire.
- Pêche, fabrication, utilisation, reproduction vanilla et échanges suivent les statistiques réellement attribuées par Minecraft. Les événements de fabrication/utilisation/blocs sont ignorés en créatif et spectateur. Certaines mécaniques d’autres mods n’attribuent pas ces statistiques et ne compteront donc pas.
- Les captures, évolutions, éclosions, fossiles et combats Cobblemon réutilisent les remontées du module intégré ; une limite d’XP du battlepass ne bloque pas la progression des quêtes.
- Les noms du catalogue dépendent des traductions disponibles sur le serveur et peuvent être en anglais. Le site ne génère pas de fausses images ni de faux objets.
- Pas d’envoi de skin, de cinématique, de téléportation ou de commande libre dans cette version. Les limites de taille des dialogues restent celles du moteur réseau.
- La publication exige la passerelle scénarios version 2. Il faut le nouveau JAR côté serveur et côté client pour retirer aussi les anciens onglets du journal. La migration SQL du studio reste `010_quest_studio.sql`, aucune migration supplémentaire n’est nécessaire.

Les tests locaux couvrent le moteur de séquence, l’API et le parcours navigateur. L’ensemble doit encore être testé dans le véritable serveur Minecraft après déploiement.
