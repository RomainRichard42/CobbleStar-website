# Pokémon Star — 6.39.35

## Livraison et déploiement

Le WonderTrade est supprimé : commandes `/wt` et `/wondertrade`, menu, simulation, réseau et cinématique. Les anciens journaux de transactions du monde et anciens JAR sont conservés pour récupération ; aucun Pokémon déjà échangé n'est repris. Les six logos Ranked et le rang Star à 2000 points restent en place. Le logo du rang se fournit séparément dans `assets/cobblestar_planets/textures/gui/ranks/star.png`.

1. Installer `build/libs/cobblestar-6.39.35.jar` côté serveur et clients, en remplaçant l'ancien JAR CobbleStar.
2. Déployer les modifications du site/API dans `cobblestar-launcher/CobbleStar-website-git`, avec la migration **012_star_pokemon.sql** (le démarrage Kinetic utilise déjà le moteur de migrations).
3. Conserver `cobblestar-admin-bridge.json` activé et `cobblestar-link.json` configuré avec `apiBaseUrl` HTTPS et la clé serveur habituelle. Aucun secret n'est transmis aux clients.
4. Le proxy doit accepter au moins **8 Mio** pour les imports JSON et laisser accessibles les téléchargements publics `/api/star/packs/<hash>.zip`. Les packs utilisent des URL immuables avec SHA-1 vérifié par Minecraft.
5. Ouvrir **Centre de contrôle → Pokémon Star** (`/admin/star/`). Le serveur envoie son catalogue natif, puis vérifie les publications toutes les 30 secondes. `/pokemonstar sync` demande une synchronisation au prochain tick, `/pokemonstar status` donne l'état (OP uniquement).

Le déploiement Git ne publie pas de modèle automatiquement : la migration s'applique au démarrage Kinetic, puis l'admin publie explicitement chaque modèle. Aucun accès à la base de production n'est nécessaire pour préparer les assets.

## Import et publication

Choisir une espèce du catalogue serveur. Importer son modèle Bedrock `.geo.json` exporté depuis Blockbench, sa texture PNG et éventuellement un calque PNG emissif. Le projet `.bbmodel` doit être exporté en Bedrock avant import.

- Garder **les noms et parents des os natifs**. Les cubes et os additionnels sont modifiables, les animations et le poser Cobblemon sont réutilisés. Ce flux ne remplace pas les animations natives par des animations importées.
- Textures RGB/RGBA 8 bits non entrelacées, dimensions identiques aux dimensions UV du modèle, maximum 1024×1024 et 2 Mo par PNG. Le calque emissif est transparent sauf sur les détails lumineux.
- Enregistrer le brouillon ne change pas le jeu. **Publier le modèle Star** valide l'import et reconstruit le pack, en gardant les autres espèces déjà publiées. Une erreur conserve la publication précédente. Les conflits de révision refusent l'écrasement silencieux d'un autre admin.
- Chaque espèce a une variante Star de base. Les formes régionales alternatives restent hors du présent éditeur par forme ; le modèle utilise le squelette par défaut de l'espèce.
- Les modèles sont servis par le système standard de packs serveur Minecraft. Le pack Star est requis une fois publié : son refus empêche l'accès selon le comportement natif Minecraft. Aucun exécutable ni script client n'est téléchargé.
- Les nouvelles apparitions Star sont suspendues tant que tous les clients connectés n'ont pas confirmé le chargement de la révision courante. Une confirmation tardive d'un ancien pack ne valide pas la nouvelle révision.

Le site distingue brouillon, publication, réception serveur et nombre de clients prêts. Les assets et archives publiés restent en base SQL ; le serveur garde le dernier manifeste dans `<monde>/cobblestar-star/published.json`. Ce cache permet de retrouver les modèles publiés après redémarrage (le téléchargement du pack exige toujours l'API accessible).

## Rareté et sauvegarde

Une chance Star = **1 / (2 × shinyRate Cobblemon)** par apparition naturelle éligible. Exemple : shiny à 1/4096 → Star à 1/8192. Il s'agit du taux global configuré, pas des bonus individuels shiny (charme/combo/etc.). Les probabilités shiny natives ne sont pas modifiées ; le visuel Star est prioritaire si les deux propriétés sont présentes.

Aucun tirage Star sur chargement de chunk, sortie d'équipe, cadeau ou test : le crochet est l'événement natif d'apparition Cobblemon. Aucun spawn Star sans espèce publiée et pack chargé. Le système ne modifie ni stats, ni IV, ni niveau. L'aspect natif `cobblestar-star` est sauvegardé avec le Pokémon et conservé lors de la capture et du stockage. L'évolution conserve cet aspect ; si l'espèce d'arrivée n'a pas encore de modèle Star, son apparence native sert de repli. Il est donc conseillé de publier la lignée avant d'activer une espèce évolutive.

## Dracolosse Star prêt à importer

Les vrais fichiers du JAR Cobblemon 1.8 sont dans `art_sources/star-dragonite/original/`, avec leur licence fournie. Ouvrir `dragonite.geo.json` dans Blockbench puis importer `dragonite.png`. `source-preview.png` est un rendu technique de cette géométrie, pas une capture en jeu.

Le concept `dracolosse-star-concept-v1.png` a été validé. Les fichiers de production sont dans `art_sources/star-dragonite/import/` : `dragonite.geo.json`, `dragonite.png` et `dragonite_glow.png` (256 × 128). Le générateur reproductible est `scripts/BuildDragoniteStar.java`.

**Sur le site : Admin → Pokémon Star → Charger Dracolosse Star → Enregistrer le brouillon → Publier le modèle Star.** Le bouton remplit les trois fichiers ; il ne publie rien silencieusement. Les mêmes fichiers sont téléchargeables sous `/downloads/pokemon-star/dragonite/`.

Il s'agit d'une adaptation des textures UV natives, pas d'une reconstruction : corps ivoire/lavande, membrane indigo sur les deux faces des ailes, armatures champagne, trois étoiles cyan par aile, marque pectorale et liseré de queue lumineux. Seuls six petits cubes étoilés sont ajoutés aux extrémités des deux antennes. Tous les os, parents, pivots et cubes d'origine restent en place ; les animations et le poser `cobblemon:dragonite` sont réutilisés sans modification. Aucun nouveau rig ni fichier d'animation n'est nécessaire.

Le calque emissif maintient la luminosité des petites marques. Le halo/bloom dépend du shader. `import/preview.png` est un rendu technique des vrais fichiers en pose neutre, pas une capture Minecraft. Les crédits et la licence d'origine sont fournis dans les imports et dans chaque pack publié.

## Vérifications

Compilation du mod Fabric sur les API Cobblemon 1.8 réelles, compilation TypeScript API et build Next.js, tests ciblés de validation géométrie/PNG, archives déterministes, conservation des espèces et calque emissif. Import du vrai modèle de Dracolosse vérifié. Le téléchargement/rechargement du pack avec deux clients et le rendu avec Iris/Complementary doivent encore être testés en jeu. La chaîne SQL/authentification n'a pas été exécutée contre une base de production.
