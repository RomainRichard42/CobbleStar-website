# CobbleStar — déploiement Kinetic

Cette application sert le site CobbleStar et son API sur le même port (`25577`).

## Démarrage

1. Dupliquer `.env.example` sous le nom `.env`.
2. Remplacer toutes les valeurs `REPLACE...`, `GENERATE...` et `YOUR...` dans `.env`.
3. Installer les dépendances avec `npm ci --omit=dev`.
4. Démarrer avec `npm start`. Les tables MySQL sont créées automatiquement.

Le répertoire `site/` contient le site statique. Le répertoire `dist/` contient l’API déjà compilée.

## Variables sensibles

- `DB_PASSWORD` : mot de passe MySQL affiché par Kinetic.
- `COOKIE_SECRET` : secret aléatoire d’au moins 32 caractères.
- `DISCORD_CLIENT_ID` : identifiant de l’application créée dans le portail développeur Discord.
- `DISCORD_CLIENT_SECRET` : secret OAuth2 de cette application, conservé uniquement dans Kinetic.
- `DISCORD_BOT_TOKEN` : token privé du bot appartenant à cette même application.
- `DISCORD_GUILD_ID` : `1540002066469101629`, identifiant du Discord CobbleStar.
- `MINECRAFT_SERVER_KEY` : autre secret aléatoire d’au moins 32 caractères, qui sera aussi configuré dans le futur mod Fabric.

La clé Minecraft peut être générée sans l'afficher dans un service tiers avec
`openssl rand -base64 48`. La même valeur doit être placée dans
`config/cobblestar-link.json` sur le serveur Minecraft.

Ne jamais publier le fichier `.env`, les mots de passe ou les clés dans GitHub.

Dans le portail développeur Discord, ajouter exactement cette URL de redirection OAuth2 :
`https://cobblestar-mc.fr/api/auth/discord/callback`. Elle est dérivée de
`PUBLIC_API_URL`, qui doit donc correspondre au domaine réellement servi aux joueurs.
Le bot de cette même application doit être installé sur le Discord CobbleStar avec
la permission **Créer une invitation**. Le parcours demande `guilds.join`, puis
l’API ajoute le membre au serveur avant d’ouvrir sa session CobbleStar.
Discord est l’unique méthode de création de compte et de connexion. Lors de sa
première connexion, l’e-mail Discord vérifié rattache automatiquement un éventuel
ancien compte afin de conserver sa liaison Minecraft, son portefeuille et son historique.

## Annuaires de vote

Éditer `vote-sites.json` avec les URL réelles et activer uniquement les portails
dont le webhook est relié à `/api/internal/votes/record`. Le champ URL accepte
`{username}` pour préremplir le pseudo du compte Minecraft lié.

## Vérification

Une fois démarré, `GET /api/health` doit renvoyer un état `ok`. Le domaine public doit être envoyé par le reverse proxy Kinetic vers `23.109.138.130:25577`.

## Bot Discord : tickets, journaux et Minecraft (6.47.15)

Le bot utilise la même application et le même token que la connexion Discord du site.
Ne pas créer une seconde application, réinitialiser le token ni changer les URL OAuth.
Le nom visible du bot ne suffit pas à l’identifier : vérifier son application et son serveur dans le portail Discord.

### Installation

1. Déployer l’API compilée, `package.json`, `package-lock.json` et les migrations, dont `014_discord_operations.sql`.
2. Installer les dépendances avec `npm ci --omit=dev` après compilation. Le démarrage `npm run kinetic` applique les migrations.
3. Dans le portail développeur Discord, activer **Server Members Intent** et **Message Content Intent**.
4. Le bot doit être installé avec les scopes `bot` et `applications.commands`. Permissions : voir les salons autorisés, lire l’historique, envoyer des messages, joindre des fichiers, gérer les salons et gérer les rôles/permissions des salons de tickets. **Gérer le serveur** est nécessaire pour consulter les compteurs d’invitations. Inutile de donner Administrateur au bot.
5. Ajouter `DISCORD_GATEWAY_ENABLED=true` dans Kinetic. Aucun autre secret n’est nécessaire. Le Gateway est démarré avec l’API ; un verrou SQL empêche deux instances de traiter simultanément les événements. L’utilisateur SQL doit autoriser `GET_LOCK` / `RELEASE_LOCK`.
6. Installer le JAR CobbleStar 6.47.15 sur le serveur Minecraft, qui inclut GTS 0.15.8. Les ajouts Discord/mini-jeux n’ajoutent aucun paquet client ni ressource graphique.

La configuration est désactivée par défaut : compiler ne connecte pas le bot et ne crée aucun salon sur le Discord réel.

### Configuration dans Discord

Le plus simple : choisir deux rôles existants, puis lancer l’initialisation :

```text
/csconfig role usage:staff role:@Staff
/csconfig role usage:admin role:@Administrateurs
/csconfig initialiser
```

Cette dernière commande crée seulement les salons et catégories encore manquants : logs privés, GTS/mini-jeux publics et quatre catégories de tickets. Elle ne remplace pas les salons déjà configurés et ne lit aucun salon existant sans `surveiller`.
Pour utiliser plutôt des salons/catégories existants ou personnaliser les destinations :

```text
/csconfig role usage:staff role:@Staff
/csconfig role usage:admin role:@Administrateurs
/csconfig salon usage:tickets salon:#archives-tickets
/csconfig salon usage:moderation salon:#logs-discord
/csconfig salon usage:members salon:#arrivees
/csconfig salon usage:chat salon:#chat-minecraft-admin
/csconfig salon usage:private salon:#mp-minecraft-admin
/csconfig salon usage:gts salon:#gts
/csconfig salon usage:minigame salon:#mini-jeux
/csconfig categorie etape:reception categorie:Réception
/csconfig categorie etape:en_cours categorie:En-cours
/csconfig categorie etape:bug categorie:Bug
/csconfig categorie etape:a_fermer categorie:À-fermer
/csconfig surveiller salon:#general actif:true
/csconfig retention jours:30
/csconfig statut
```

`/csconfig panneau` publie le bouton **Créer un ticket** dans le salon où la commande est utilisée.
Les commandes de configuration sont réservées aux administrateurs Discord, y compris si quelqu’un modifie leur visibilité.

Les destinations `chat` et `private` doivent refuser **Voir le salon** à `@everyone` et à tout rôle autre que le rôle admin configuré ; les administrateurs Discord conservent naturellement leur accès.
Les destinations `tickets`, `moderation` et `members` sont privées au rôle staff configuré. Le bot vérifie ces accès avant chaque livraison et refuse d’envoyer dans un salon trop ouvert. Le rôle staff ne donne pas automatiquement accès aux MP.
Les logs de messages/réactions concernent seulement les salons activés avec `surveiller` ; pas les MP Discord, pas tous les salons privés du serveur par défaut.

### Utilisation des tickets

- `/ticket creer` : formulaire sujet + description, un ticket ouvert par personne.
- `/ticket claim` : attribution au staff, passage à En cours si configuré ; une personne à la fois peut claim.
- `/ticket deplacer etape:bug` : changement de catégorie sans rendre le ticket public.
- `/ticket ajouter joueur:@Joueur` : accès explicite d’un autre membre, conservé après déplacement.
- `/ticket fermer resume:...` : demande de confirmation au propriétaire, boutons Confirmer / Garder ouvert valables 24 h.
- `/ticket forcer-fermeture resume:...` : fermeture par le staff sans accord supplémentaire du propriétaire.

La fermeture fige le salon, archive le texte chronologique et les liens des pièces jointes en fichiers UTF-8, puis publie un résumé **sujet / demande / staff / conclusion**. C’est un résumé déterministe, sans envoi des échanges vers une IA externe. Les fichiers joints originaux ne sont pas recopiés : leurs URL Discord peuvent expirer.
Si l’archivage échoue, le ticket n’est pas supprimé ; le staff peut réessayer. Après succès, les participants conservent la lecture jusqu’à expiration de la conservation. Les salons fermés créés par ce bot, les messages de logs identifiés en base et les caches sont purgés à expiration (30 jours par défaut, 1 à 90 configurables). Les sauvegardes SQL/hébergeur ont leur propre rétention à régler séparément.

### Passerelle Minecraft

Au premier démarrage, le mod crée `config/cobblestar-discord.json` :

```json
{
  "enabled": true,
  "serverId": "main",
  "publicChat": true,
  "gts": true,
  "privateMessages": false,
  "privacyNoticeConfigured": false
}
```

Il réutilise `apiBaseUrl` et `serverKey` de `config/cobblestar-link.json` (HTTPS obligatoire).
Redémarrer Minecraft après modification. `/discordbridge status` est réservé aux OP niveau 4.
Les ventes sont signalées après sauvegarde GTS ; les annonces déjà présentes au premier démarrage ne sont pas republiées en masse. Un contrôle du fichier GTS sert de rattrapage.
Le chat est envoyé dans un seul sens, Minecraft vers Discord : aucun message Discord ne peut exécuter une commande Minecraft.

Pour les **MP Minecraft**, informer les joueurs dans le règlement puis activer `privateMessages` et `privacyNoticeConfigured`, ainsi que `/csconfig mp actif:true`. Un rappel est affiché à la connexion.
La capture couvre le chemin vanilla `/msg`, `/tell`, `/w`. Un `/r` ou une messagerie entièrement remplacée par un autre mod nécessite une intégration dédiée : ne pas prétendre que toutes les commandes de tous les mods sont capturées.

Le fichier local `cobblestar-discord-outbox.json` contient les événements en attente : le protéger comme un journal privé. File limitée à 2 000 événements, expiration après 24 h et sauvegarde périodique ; un arrêt brutal peut perdre les dernières secondes. L’API déduplique les identifiants. Une panne entre envoi Discord et confirmation SQL peut encore entraîner une répétition d’un message Discord (livraison au moins une fois, pas de promesse « exactement une fois »). Un salon non configuré rejette l’événement, visible dans le compteur « écartés » du statut.

### Mini-jeux du chat

Ils n’existaient pas dans le projet : le mod ajoute calcul express et Pokémon mélangé.
`config/cobblestar-chatgames.json` est créé au démarrage, désactivé par défaut :

```json
{
  "enabled": true,
  "intervalMinutes": 30,
  "durationSeconds": 90,
  "words": ["Pikachu", "Dracolosse", "Évoli", "Gobou"],
  "winnerCommands": []
}
```

Les annonces jeu et Discord utilisent la même horloge : 10 minutes avant, 5 minutes avant, départ, puis gagnant/fin.
Le premier joueur à donner la bonne réponse gagne ; les accents/majuscules sont tolérés pour les noms. Les parties vides sont reportées. Aucune monnaie ni objet n’est inventé : `winnerCommands` est une liste de commandes console décidées par l’admin, avec `{player}` remplacé par le nom du gagnant.

```text
/chatgames reload
/chatgames status
/chatgames programmer 15
/chatgames demarrer
/chatgames stop
```

Commandes OP niveau 4. `demarrer` sert au test immédiat. `stop` arrête la session ; mettre `enabled:false` dans le fichier pour rester désactivé après redémarrage. Une partie interrompue par redémarrage n’attribue aucune récompense et est reprogrammée.

### Rôles Minecraft synchronisés et compteurs du serveur (mod 6.47.17)

Déployer l’API et la migration `015_discord_game_sync.sql`, installer le mod serveur 6.47.17 et activer la passerelle. Il n’y a pas de nouvelle dépendance ni de mise à jour client nécessaire pour ces fonctions. L’erreur MySQL `1206` de l’hébergeur doit être résolue : une compilation réussie ne suffit pas à démarrer les migrations.

Le mod utilise la même clé serveur et transmet un instantané toutes les 30 secondes. Dans `config/cobblestar-discord.json`, les nouveaux paramètres sont `roleSync:true`, `serverStatus:true` et `maintenance:false` ; leur absence dans un ancien fichier conserve ces valeurs par défaut, mais `enabled:true` reste obligatoire. Les rôles et compteurs sont également désactivés par défaut côté Discord, à activer séparément.

Le bot doit avoir **Gérer les rôles** et **Gérer les salons** ; son rôle doit être au-dessus des rôles de progression à synchroniser. Aucun rôle staff, rôle privilégié, rôle d’intégration ou `@everyone` ne peut être associé. Les rôles existants non gérés par cette fonction ne sont pas remplacés.

```text
/csconfig sync-role type:grade valeur:recrue role:@Recrue
/csconfig sync-role type:grade valeur:eclaireur role:@Éclaireur
/csconfig sync-role type:premium valeur:etoile role:@Étoile
/csconfig sync-role type:premium valeur:cosmique role:@Cosmique
/csconfig sync-role type:premium valeur:galactique role:@Galactique
/csconfig sync-role type:ranked valeur:star role:@Star
/csconfig sync-role type:club valeur:UUID-DU-CLUB role:@MonClub
/csconfig synchronisation actif:true
/csconfig serveur actif:true
/csconfig statut
```

L’appel `/csconfig serveur actif:true` crée une seule catégorie **🌌 COBBLESTAR** avec deux salons vocaux de compteurs, visibles mais non connectables : **Serveur : En ligne / Maintenance / Hors ligne / Sans réponse** et **Joueurs : N / capacité**. Pour choisir une catégorie existante : `/csconfig serveur actif:true categorie:MaCatégorie`. Les appels répétés réutilisent les salons créés. Les renommages sont regroupés au plus une fois toutes les 5 minutes par compteur ; discord.js suit en plus les limites retournées par Discord. La réception est visible avec `/csconfig statut`, sans attendre le renommage.

Les grades acceptés sont `recrue`, `eclaireur`, `aventurier`, `prodige`, `veteran`, `gardien`, `elite`, `mercenaire`. C’est le grade de progression, pas les tags cosmétiques équipés dans le chat. Le rôle ranked utilise le meilleur rang **placé** de la **saison actuelle** parmi les files solo, double et coop : `bronze`, `argent`, `or`, `platine`, `diamant`, `maitre`, `star`. Les tests solo et matchs de placement ne donnent pas de rôle ranked. Aucun rang Star ne donne de permission administrative.

La source `premium` synchronise **le plus haut grade payant possédé**, indépendamment du grade gratuit : `etoile`, `cosmique`, `galactique`. Les variantes de tags A/B donnent la même famille. Le mod lit les droits effectifs LuckPerms (`cobblestar.tags.etoile`, `.cosmiquea`, `.cosmiqueb`, `.galactiquea`, `.galactiqueb`) ou les glyphes de leurs préfixes réels ; un refus explicite l’emporte. Le préfixe transitoire de `/tags` est ignoré. Les groupes et achats ne sont jamais modifiés par Discord. Si tes groupes commerciaux ne contiennent pas déjà ces droits/préfixes, ajoute la permission de tag correspondante au groupe LuckPerms réellement attribué par ta boutique.

Les joueurs hors ligne sont lus en arrière-plan via l’API publique LuckPerms, avec un cache d’une minute et des lots bornés. Une révocation confirmée enlève le badge payant suivi par le bot. En cas de panne LuckPerms ou de mod plus ancien, le champ payant est inconnu : conserver le badge déjà suivi, ne pas en attribuer un nouveau. Une déliaison le retire normalement. Compter au moins un passage de lecture, puis un nouvel envoi du profil et le lot Discord ; ce n’est pas instantané. Voir [UserManager LuckPerms](https://raw.githubusercontent.com/LuckPerms/LuckPerms/master/api/src/main/java/net/luckperms/api/model/user/UserManager.java).

Un club est identifié par son UUID stable : `/discordbridge clubs` (OP 4) affiche ses noms/identifiants. Renommer le club ne change pas son association. Le bot n’en crée pas de rôle sans configuration admin. Omettre `role` dans `/csconfig sync-role` retire l’association ; les badges auparavant gérés seront retirés lors de la prochaine synchronisation active.

Seuls les comptes Minecraft liés au site sont synchronisés. L’API résout le compte Discord depuis la liaison actuelle ; ni un pseudo choisi ni le client du jeu ne peut désigner un destinataire ou un rôle. Les profils connus sont envoyés par lots de 100 en rotation, y compris hors ligne. Un nouveau compte lié est pris en compte au passage suivant de son profil ; un compte jamais observé par le mod doit d’abord rejoindre le jeu. Les rôles sont traités par lots de 20, avec réconciliation périodique. Une panne du serveur ne supprime pas tous les badges : elle rend les compteurs périmés après 2 minutes, affichés au prochain renommage. Une déliaison ou un changement de compte retire uniquement les badges suivis par le bot sur l’ancien compte.

`source` dans `/csconfig serveur` sélectionne le `serverId` autorisé pour ces fonctions, `main` par défaut. Les autres serveurs sont refusés. Des instantanés rejoués ou l’arrêt tardif d’une ancienne session ne peuvent pas écraser la nouvelle session. Cette fonction n’ajoute pas de commande distante exécutée en jeu.

### Limites et vérification réelle

- Les messages supprimés avant que le bot les ait observés ne peuvent pas être reconstruits. L’auteur du message n’est pas présenté comme la personne l’ayant supprimé.
- L’invitant est déduit d’une hausse unique du compteur d’une invitation. Arrivées simultanées, OAuth/site, URL personnalisée et invitations uniques expirées peuvent rendre l’attribution indéterminée ; le bot l’indique.
- Faire un essai avec un compte sans rôle : il ne doit voir ni tickets des autres ni journaux. Tester claim, ajout, déplacement, refus/confirmation de fermeture et fermeture forcée avec un staff.
- Tester une vente GTS, un message public, un MP et `/chatgames demarrer` ; vérifier que chaque type arrive uniquement dans le salon prévu.
- Les tests automatisés n’activent pas Discord et ne remplacent pas cette recette sur le serveur réel.
