# CobbleStar — déploiement Kinetic

Cette application sert le site CobbleStar et son API sur le même port (`25577`).

## Démarrage

1. Dupliquer `.env.example` sous le nom `.env`.
2. Remplacer les quatre valeurs `REPLACE...` / `GENERATE...` dans `.env`.
3. Installer les dépendances avec `npm ci --omit=dev`.
4. Démarrer avec `npm start`. Les tables MySQL sont créées automatiquement.

Le répertoire `site/` contient le site statique. Le répertoire `dist/` contient l’API déjà compilée.

## Variables sensibles

- `DB_PASSWORD` : mot de passe MySQL affiché par Kinetic.
- `COOKIE_SECRET` : secret aléatoire d’au moins 32 caractères.
- `MINECRAFT_SERVER_KEY` : autre secret aléatoire d’au moins 32 caractères, qui sera aussi configuré dans le futur mod Fabric.
- `NEXT_PUBLIC_ACCOUNTS_ENABLED` : laisser `false` pendant la bêta fermée, puis passer à `true` et redémarrer pour ouvrir l'espace compte.

La clé Minecraft peut être générée sans l'afficher dans un service tiers avec
`openssl rand -base64 48`. La même valeur doit être placée dans
`config/cobblestar-link.json` sur le serveur Minecraft.

Ne jamais publier le fichier `.env`, les mots de passe ou les clés dans GitHub.

## Annuaires de vote

Éditer `vote-sites.json` avec les URL réelles et activer uniquement les portails
dont le webhook est relié à `/api/internal/votes/record`. Le champ URL accepte
`{username}` pour préremplir le pseudo du compte Minecraft lié.

## Vérification

Une fois démarré, `GET /api/health` doit renvoyer un état `ok`. Le domaine public doit être envoyé par le reverse proxy Kinetic vers `23.109.138.130:25577`.
