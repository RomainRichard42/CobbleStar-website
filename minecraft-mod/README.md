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

Le JAR à installer est `build/libs/cobblestar-core-1.1.0.jar` (pas le
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
