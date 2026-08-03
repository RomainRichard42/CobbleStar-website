# Installer la liaison compte CobbleStar ↔ Minecraft

## 1. Mettre à jour le site

Depuis le dossier du site :

```powershell
git add .
git commit -m "feat: ajoute la liaison des comptes Minecraft"
git push origin main
```

Kinetic récupère ensuite le nouveau commit au redémarrage du serveur Web.

## 2. Créer la clé privée

Dans PowerShell, générer une clé aléatoire :

```powershell
$bytes = New-Object byte[] 48
[Security.Cryptography.RandomNumberGenerator]::Create().GetBytes($bytes)
[Convert]::ToBase64String($bytes)
```

Conserver le résultat en privé. Ne jamais l'envoyer sur Discord, GitHub ou dans
un message.

Dans le `.env` du serveur **CobbleStar Web/API** sur Kinetic :

```env
MINECRAFT_SERVER_KEY=COLLER_LA_CLE_ICI
NEXT_PUBLIC_ACCOUNTS_ENABLED=false
```

Utiliser `true` à la place de `false` uniquement quand l'espace compte doit être
accessible. Redémarrer le serveur Web après toute modification du `.env`.

## 3. Récupérer le mod compilé

1. Ouvrir le dépôt GitHub après le push.
2. Aller dans **Actions** puis **Vérifier le site**.
3. Ouvrir l'exécution verte correspondant au dernier push.
4. Télécharger l'artefact `cobblestar-link-fabric-1.21.1`.
5. Extraire `cobblestar-link-1.0.0.jar`.

## 4. Installer le mod sur Minecraft

1. Vérifier que Fabric API est déjà présent dans `mods/`.
2. Ajouter `cobblestar-link-1.0.0.jar` dans `mods/`.
3. Vérifier `online-mode=true` dans `server.properties`.
4. Démarrer une première fois le serveur Minecraft.
5. Arrêter le serveur.
6. Ouvrir `config/cobblestar-link.json`.
7. Coller exactement la même clé dans `serverKey` :

```json
{
  "apiUrl": "https://api.cobblestar-mc.fr/api/internal/link/confirm",
  "serverKey": "COLLER_LA_MEME_CLE_ICI",
  "timeoutSeconds": 10
}
```

8. Redémarrer le serveur Minecraft.

## 5. Tester le parcours

1. Passer temporairement `NEXT_PUBLIC_ACCOUNTS_ENABLED=true`, puis redémarrer le
   serveur Web afin qu'il reconstruise le site.
2. Ouvrir `https://cobblestar-mc.fr/compte/` et créer un compte.
3. Cliquer sur **Obtenir ma commande /link**.
4. Rejoindre `play.cobblestar-mc.fr` avec le même compte Minecraft.
5. Exécuter la commande affichée, par exemple `/link CS-ABCDE-23456`.
6. La page doit indiquer automatiquement que l'UUID est lié.

La validation Microsoft du launcher n'intervient pas dans ce mécanisme.
