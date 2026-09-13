# Pokémon Star — correction HTTP 413 / 6.39.36

Le catalogue des squelettes Cobblemon était envoyé en un seul JSON de plusieurs Mo. Un proxy peut le refuser avant l'API, même si la limite interne de l'API est suffisante.

Le mod compresse désormais le catalogue en gzip, puis transmet des fragments de 48 Kio binaires encodés en JSON (chaque requête reste sous 96 Kio). L'API authentifie, réassemble et vérifie le SHA-256 et les bornes de décompression avant de valider le catalogue complet. Les transferts expirent après deux minutes. Aucune liste partielle ne remplace le catalogue enregistré. L'état de connexion continue à être envoyé si une ancienne API refuse les fragments.

## Installation

1. Déployer la nouvelle API depuis le dépôt du site sur Kinetic ; aucune nouvelle migration SQL pour ce correctif.
2. Remplacer le JAR du serveur par `cobblestar-6.39.36.jar`, puis redémarrer. Les clients 6.39.35 restent compatibles : aucun nouveau paquet de jeu dans ce correctif serveur.
3. Exécuter `/pokemonstar sync`, puis `/pokemonstar status` après quelques secondes.
4. Vérifier « catalogue … espèces (reçu par le site) » ou le journal « Pokémon Star : catalogue de … espèces reçu par le site ».
5. Rafraîchir le panneau Pokémon Star, charger Dracolosse Star, enregistrer puis publier.

« 0 espèces publiées / pack absent » est normal avant la première publication : ce compteur n'est pas celui du catalogue. La chance `1/16384` signifie un taux shiny global configuré à `1/8192`, donc Star deux fois plus rare.

Le proxy doit accepter 96 Kio par requête de synchronisation. Les imports manuels de gros modèles restent distincts et conservent leur limite API de 8 Mio. Ne pas retirer les limites HTTP globales.
