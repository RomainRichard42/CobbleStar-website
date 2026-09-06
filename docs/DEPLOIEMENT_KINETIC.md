# Déploiement sur Kinetic

Le workflow présent est `.github/workflows/ci.yml` : il vérifie le site et l’API,
puis fournit un artefact `cobblestar-kinetic`. Aucun `deploy.yml` n’est installé.
Il faut transférer cet artefact sur Kinetic et redémarrer l’application, ou
configurer explicitement un déploiement automatique avec les accès ci-dessous.

## 1. Créer le dépôt

Créer un dépôt privé GitHub nommé `CobbleStar-website`, puis y pousser ce projet
sur la branche `main`.

## 2. Autoriser les Actions

Dans GitHub : **Settings → Actions → General**, conserver les Actions activées.
Le workflow n'a besoin que de la permission de lecture du dépôt.

## 3. Ajouter les secrets

Dans **Settings → Secrets and variables → Actions → New repository secret**,
ajouter :

| Secret | Valeur attendue |
| --- | --- |
| `KINETIC_SFTP_HOST` | Hôte SFTP affiché par Kinetic, sans `sftp://` |
| `KINETIC_SFTP_PORT` | Port SFTP affiché par Kinetic |
| `KINETIC_SFTP_USERNAME` | Identifiant SFTP du split CobbleStar Web |
| `KINETIC_SFTP_PASSWORD` | Mot de passe du compte Kinetic/SFTP |
| `KINETIC_PANEL_URL` | URL du panel Kinetic, avec `https://` |
| `KINETIC_SERVER_ID` | Identifiant API du split CobbleStar Web |
| `KINETIC_API_KEY` | Clé API cliente créée dans le compte Kinetic |

Ne pas placer les variables MySQL ou les secrets applicatifs dans GitHub : le
workflow préserve le fichier `.env` déjà présent sur le serveur.

## 4. Paramètres Kinetic à conserver

- Node.js 22
- Main file : `dist/server.js`
- Port : `25577`
- `USER UPLOADED FILES` : activé
- `AUTO UPDATE` Git : désactivé, car GitHub Actions effectue déjà le déploiement

Au redémarrage, Kinetic exécute `npm install`, puis démarre `dist/server.js`.

## 5. Premier lancement

La CI fonctionne sans les secrets de déploiement. Leur ajout seul n’installe pas
de déploiement automatique : il faut aussi créer et vérifier le workflow de
transfert/redémarrage. Ne pas considérer un build vert comme une mise en ligne.

Après transfert, `/api/health` doit annoncer `version: "player-admin-v1"`.
`GET /api/internal/admin/status`, avec la clé Minecraft en Bearer, permet de
vérifier la configuration Discord/admin et la réception des relevés, sans
exposer ces informations publiquement.

## Retour arrière

Pour restaurer une version, ouvrir le commit stable dans GitHub, créer un commit
qui annule les changements (`git revert`), puis le pousser sur `main`. Le même
processus de transfert permettra ensuite de remettre cette version en ligne.
