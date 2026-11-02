# Pack serveur unifié — Minecraft 1.21.1

Le pack envoyé par `StarPokemonService` regroupe E19 Cobblemon Minimap Icons, PackPackStar, NouveauTags et les ressources CobbleStar déjà publiées : formes Star et régionales, interfaces, grades, cartes, SGA, machines, cosmétiques et PNJ.

L’envoi existant utilise un seul paquet `ClientboundResourcePackPushPacket`, avec `required=true`, une URL immuable `/api/star/packs/<sha1>.zip` et le SHA-1 du ZIP réellement téléchargé. Ne pas ajouter un second téléchargement dans `server.properties`. Refuser le pack obligatoire empêche de rejoindre ; Minecraft réutilise son cache tant que le contenu reste identique.

## Sources et priorité

`api/server-resource-pack/base.zip` contient les trois anciens packs de fichiers. `manifest.json` fixe leurs empreintes, leur ordre et celle de l’archive. Le générateur lit uniquement cet artefact local vérifié. Les publications CobbleStar passent au-dessus ; les polices conservent leurs fournisseurs de glyphes dans le même ordre de priorité. Les PNG de grades ne sont pas redessinés.

Reconstruction de la base : `python scripts/build-server-resource-pack.py <dossier-des-trois-packs>`. Les métadonnées et crédits d’origine restent dans `licenses/server-pack/`. Le format cible est 34.

L’API reconstruit automatiquement les ressources partagées à la première synchronisation authentifiée après son redémarrage. Elle reprend uniquement les variantes déjà publiées et conserve les brouillons. Les anciennes archives restent disponibles pour les clients en cours de connexion ; une erreur de publication conserve la publication précédente.

## Launcher

Le modpack 1.1.7 ne distribue plus les trois ZIP séparés. Le launcher 0.8.4 retire seulement leurs noms des options actives et incompatibles ; les packs personnels, les ressources internes des mods et l’échelle d’interface restent conservés. Les anciens fichiers gérés sont retirés lors de la synchronisation normale du modpack.

## Validation

Compilation TypeScript, conservation des fichiers de base, priorité des polices et des textures, tests des publications Star et des cosmétiques existants, intégrité du ZIP et contrôle du téléchargement réel par SHA-1. Aucun client Minecraft lancé pour cette intervention.
