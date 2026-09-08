# Synchronisation arènes derrière le proxy Kinetic

Le proxy de production a renvoyé une page HTML `413 nginx/1.18.0` pour une requête de 1 100 017 octets, alors qu'une requête de 327 697 octets atteignait l'API. Ces vérifications sans clé valide n'ont modifié aucune donnée métier.

## Déploiement

1. Déployer la nouvelle API et redémarrer Node sur Kinetic. Aucun changement de dépendances, de secrets ou de migration SQL.
2. Installer `cobblestar-6.23.2.jar` à la place de l'ancien JAR serveur, puis redémarrer. Aligner également le client sur cette version.
3. Attendre la synchronisation automatique puis utiliser `arenesync` dans la console (ou `/arene sync` en jeu, opérateur).
4. Vérifier un dernier succès récent, puis actualiser la page admin. La révision peut rester **0** tant qu'aucune publication admin n'a eu lieu : cela n'empêche pas l'import initial.

Ne pas supprimer le reverse proxy, changer les DNS, supprimer les données ni reconstruire les arènes. Un push GitHub ne déploie pas, à lui seul, l'application sur Kinetic.

Si le mod reçoit HTTP 404 sur `/api/internal/arenas/sync/chunk`, la nouvelle API n'est pas encore déployée. L'ancien endpoint reste disponible pour les anciens clients et les petits accusés de réception.

## Protocole

- Les envois dépassant 128 Kio sont découpés en fragments de **128 Kio bruts** ; le JSON avec Base64 reste sous **180 Kio** par requête.
- `POST /api/internal/arenas/sync/chunk` utilise exactement l'authentification serveur HTTPS existante. La clé est vérifiée avant la lecture du corps et avant toute allocation d'un transfert.
- Chaque fragment porte `serverId`, `uploadId` UUID, `index`, `total`, `bytes`, `sha256`, `data` Base64 canonique.
- Taille totale maximale : 2 Mio, soit 16 fragments. Aucun relèvement ni suppression de la limite applicative.
- Les réponses intermédiaires confirment uniquement le fragment (`pending`, `uploadId`, `index`). La dernière réponse utilise le protocole existant `revision` / `content`.
- Le serveur assemble les octets, vérifie taille, empreinte SHA-256, UTF-8, schéma complet et identité du serveur, puis appelle la même transaction SQL que l'envoi historique. Aucun brouillon ni catalogue partiel n'est exposé.
- Un seul transfert actif par serveur ; huit transferts maximum, expiration fixe de 120 secondes. Duplicats identiques acceptés, duplicats contradictoires refusés. Les entrées expirées sont purgées à la prochaine réception ; mémoire toujours bornée.
- Le mod envoie séquentiellement hors du thread de jeu, limite chaque requête à 10 secondes et chaque transfert à 90 secondes. En cas d'échec, la prochaine synchronisation recommence avec un nouvel identifiant. Aucun achat ni action joueur n'est rejoué.
- Tampons temporaires en mémoire de l'instance Node : après redémarrage, l'envoi reprend au prochain cycle. Un déploiement avec plusieurs instances Node nécessite une affinité par serveur ou un stockage partagé ; le protocole échoue sans publier de données partielles sinon.

## Vérifications locales

- Tests Fastify avec authentification, corps bornés, import >1 Mio, absence de données avant le dernier fragment, publication atomique via doublure transactionnelle SQL, refus d'identités/révisions falsifiées et conservation des brouillons après réémission.
- Tests du réassembleur : UTF-8 multioctet, doublons, ordre, expiration, redémarrage, empreinte erronée, Base64 invalide, plafonds mémoire/taille et isolation des serveurs.
- Test croisé : dix fragments produits par le vrai `ArenaBridgeProtocol` Java sont reconstitués à l'identique par le réassembleur TypeScript de production.
- Le test MySQL réel reste distinct des tests à doublure et doit être vérifié en CI. Le succès local ne prouve pas la synchronisation avec le serveur Minecraft de production.

Ce changement concerne la **passerelle arènes**. Les transferts des fiches joueurs et de l'atelier quêtes restent inchangés.
