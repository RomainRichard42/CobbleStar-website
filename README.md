# CobbleStar Website

Site officiel et API du serveur Minecraft CobbleStar.

- Site : <https://cobblestar-mc.fr>
- API : <https://api.cobblestar-mc.fr/api/health>
- Minecraft : `play.cobblestar-mc.fr`
- Hébergement : Kinetic Hosting, Node.js 22

## Développement local

```bash
npm ci
npm --prefix api ci
npm run dev
```

Le site Next.js est exporté en fichiers statiques. L'API Fastify se trouve dans
`api/` et utilise MySQL en production.

## Vérification complète

```bash
npm ci
npm --prefix api ci
npm run ci
```

La commande construit le site, compile l'API et génère dans `deploy/` exactement
les fichiers destinés au serveur Kinetic.

## Déploiement

- Chaque pull request exécute les vérifications sans modifier la production.
- Chaque push sur `main` construit puis déploie automatiquement sur Kinetic.
- Le fichier `.env` reste uniquement sur Kinetic et n'est jamais envoyé sur GitHub.
- Le workflow redémarre le processus Node puis vérifie `/api/health`.

Consulte [`docs/DEPLOIEMENT_KINETIC.md`](docs/DEPLOIEMENT_KINETIC.md) pour la
configuration initiale des secrets GitHub et de Kinetic.

## Structure

```text
app/          pages et composants du site
public/       images et fichiers publics
api/src/      API Fastify
api/migrations/ migrations MySQL
scripts/      création de l'artefact Kinetic
.github/      intégration et déploiement continus
```

## Sécurité

Ne jamais versionner `.env`, un mot de passe MySQL, une clé Stripe, un token
Kinetic ou `MINECRAFT_SERVER_KEY`. Les valeurs de production sont conservées
dans les variables Kinetic et dans les secrets GitHub.
