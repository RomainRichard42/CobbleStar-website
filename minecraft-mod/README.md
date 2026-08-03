# CobbleStar Link — mod serveur Fabric 1.21.1

Ce mod ajoute `/link CS-XXXXX-XXXXX`. Il transmet à l'API le code saisi,
l'UUID authentifié du joueur connecté et son pseudo. Aucun accès MySQL n'est
présent dans le mod.

## Construction

Java 21 et Gradle 8.12 sont requis :

```bash
gradle clean build
```

Le JAR à installer est `build/libs/cobblestar-link-1.0.0.jar` (pas le
`-sources.jar`). Fabric API doit aussi être installé sur le serveur.

## Installation

1. Vérifier `online-mode=true` dans `server.properties`.
2. Placer le JAR dans `mods/`, puis démarrer une première fois.
3. Ouvrir `config/cobblestar-link.json`.
4. Remplacer `serverKey` par la valeur exacte de `MINECRAFT_SERVER_KEY` du
   `.env` du serveur Web/API.
5. Redémarrer le serveur Minecraft.

Ne jamais publier `cobblestar-link.json` : la clé permet au serveur de confirmer
une liaison. Le mod exige HTTPS et ne journalise jamais cette clé.
