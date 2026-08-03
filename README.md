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
minecraft-mod/ mod serveur Fabric 1.21.1 et commande /link
scripts/      création de l'artefact Kinetic
.github/      intégration et déploiement continus
```

## Sécurité

Ne jamais versionner `.env`, un mot de passe MySQL, une clé Stripe, un token
Kinetic ou `MINECRAFT_SERVER_KEY`. Les valeurs de production sont conservées
dans les variables Kinetic et dans les secrets GitHub.

## Liaison Minecraft

L'espace compte peut rester fermé avec `NEXT_PUBLIC_ACCOUNTS_ENABLED=false`.
Le flux API et le mod sont néanmoins prêts. Le mod serveur se construit dans
GitHub Actions à chaque push sur `main`; son JAR est disponible dans l'artefact
`cobblestar-link-fabric-1.21.1`. Voir [`minecraft-mod/README.md`](minecraft-mod/README.md).
