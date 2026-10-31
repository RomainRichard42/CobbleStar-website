# CobbleStar Core — mod serveur Fabric 1.21.1

Le mod relie le serveur à l'API CobbleStar sans ouvrir MySQL à Minecraft. Il
gère la commande `/link`, le solde de Stars et la livraison des achats faits
sur le site.

## Commandes

- `/link CS-XXXXX-XXXXX` : lie le compte du site à l'UUID Minecraft.
- `/stars` ou `/stars balance` : affiche le solde réel du joueur.
- `/stars give <joueur> <montant>` : crédite un joueur lié. Cette commande est
  limitée aux opérateurs de niveau 4 et fonctionne aussi depuis la console.

## Construction

Java 21 est requis. Le wrapper Gradle est inclus :

```bash
./gradlew clean build
```

Sous PowerShell : `./gradlew.bat clean build`.

Le JAR à installer est `build/libs/cobblestar-core-1.1.1.jar` (pas le
`-sources.jar`). Fabric API doit aussi être installé sur le serveur.

## Installation

1. Vérifier `online-mode=true` dans `server.properties`.
2. Placer le JAR dans `mods/`, puis démarrer une première fois.
3. Ouvrir `config/cobblestar-link.json`.
4. Remplacer `serverKey` par la valeur exacte de `MINECRAFT_SERVER_KEY` du
   `.env` du serveur Web/API.
5. Redémarrer le serveur Minecraft.

Les achats en attente sont vérifiés à la connexion puis toutes les cinq
secondes. Si l'inventaire est plein, l'objet est déposé aux pieds du joueur.

Ne jamais publier `cobblestar-link.json` : la clé permet au serveur de confirmer
une liaison. Le mod exige HTTPS et ne journalise jamais cette clé.

## Annonces de recharge

À partir de Core 1.1.1 et de la migration API 024, chaque nouveau paiement
Stripe réel crédité crée une annonce dans la même transaction SQL. Le module
serveur la récupère toutes les cinq secondes, hors du thread de jeu, lorsqu'au
moins un joueur est connecté. Le compte acheteur peut être hors ligne.
Le message violet/doré affiche son pseudo Minecraft, les Stars bonus compris,
et un remerciement cliquable vers la boutique. Aucun prix, e-mail, Discord ou
détail de carte n'est publié. Les tests, refus et anciennes commandes ne créent
pas d'annonce.

`serverId` vaut `main` par défaut dans `cobblestar-link.json` et correspond à
la file du serveur CobbleStar. Le suivi ne démarre pas en `online-mode=false`.
Si le serveur est vide ou arrêté, les annonces attendent jusqu'à sept jours.
Le crédit des Stars n'attend jamais la connexion Minecraft ni l'affichage.

Conserver `config/cobblestar-stars-announcements.json` : ce journal atomique
empêche le réaffichage après une réponse perdue ou un redémarrage. Un journal
illisible suspend les annonces, sans le remplacer ni affecter les Stars.
Une interruption exactement entre son enregistrement et l'envoi du message
peut supprimer une annonce ; elle ne peut pas répéter un crédit. Aucun protocole
réseau ne garantit un affichage exactement une fois dans toutes les pannes.
Les accusés peuvent être retentés ; ils ne modifient pas le portefeuille.

Cette mise à jour concerne seulement Core côté serveur, sans changement de
protocole client ni du mod principal CobbleStar.
