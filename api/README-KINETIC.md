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
