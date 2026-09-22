# Starters régionaux CobbleStar (Cobblemon 1.8.0)

Les textures et résolveurs listés dans `manifest.json` sont embarqués dans le pack obligatoire servi par l'API Star. Le mod CobbleStar contient séparément les `species_features`, les `species_additions` et les catégories de starters. Les deux déploiements sont nécessaires : le site seul ne crée pas de nouveaux types, et le mod seul n'affiche pas les couleurs régionales chez les clients.

La source des textures est le JAR officiel Cobblemon 1.8.0. Le générateur `scripts/build-regional-starters.ps1` conserve exactement les dimensions et l'alpha des atlas UV, puis recolore seulement les pixels existants. Les modèles et animations restent ceux de Cobblemon ; aucun nouveau modèle 3D n'est inclus dans cette première version. Les formes Star demeurent indépendantes.

Déployer d'abord l'API et vérifier que le nouveau pack a été chargé par les clients, puis déployer le JAR et redémarrer le serveur. Le pack seul n'active aucune forme. Tester ensuite en jeu les six choix régionaux, chaque évolution, les attaques et la version chromatique. La reconstruction du pack Star par l'API distribue les nouveaux assets aux clients connectés, mais ne remplace pas le redémarrage requis pour charger les données du mod.
