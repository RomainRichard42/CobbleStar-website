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

Ne jamais publier le fichier `.env`, les mots de passe ou les clés dans GitHub.

## Vérification

Une fois démarré, `GET /api/health` doit renvoyer un état `ok`. Le domaine public doit être envoyé par le reverse proxy Kinetic vers `23.109.138.130:25577`.
