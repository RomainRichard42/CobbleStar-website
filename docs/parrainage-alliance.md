# Parrainage Discord / Minecraft — Dracolosse Alliance

## Livraison

Serveur CobbleStar 6.47.22, Minecraft 1.21.1 / Cobblemon 1.8.0.
Le skin (textures et resolver, rig natif inchangé) est inclus dans le pack
serveur obligatoire de l'API. Il n'est pas une espèce Star et ne change pas
les spawns. Aucune mise à jour client n'est nécessaire pour ce seul skin.

Redémarrer l'API après son déploiement pour appliquer la migration 017 et
reconstruire le pack, puis installer le JAR serveur et redémarrer Minecraft.
Ne pas supprimer `config/cobblestar-referrals.json` : il conserve les clés
gagnées/utilisées et les heures suivies. Sauvegarder avec le monde.

## Prérequis

- API : `DISCORD_GATEWAY_ENABLED=true`, token et `DISCORD_GUILD_ID` déjà
  configurés dans l'environnement / `.env` de l'API (pas dans le mod).
- Bot : Server Members Intent activé dans le portail Discord, permission
  **Gérer le serveur** pour lire les invitations et **Créer une invitation**
  dans le salon où les joueurs utilisent `/parrainage lien`.
- Minecraft : passerelle Discord activée dans `config/cobblestar-discord.json` ;
  même serveur sélectionné que celui du bot, URL et clé existantes de
  `config/cobblestar-link.json`. Serveur authentifié (`online-mode=true`).
- Chaque participant lie son compte avec `/link`. Une nouvelle arrivée Discord
  doit précéder sa première arrivée Minecraft. Les joueurs déjà présents en
  jeu avant l'événement ne deviennent pas de nouveaux filleuls rétroactivement.

## Parcours joueur

1. Discord : `/parrainage lien` crée son lien personnel.
2. Le nouvel invité rejoint via ce lien, lie son compte Minecraft, puis joue
   **5 heures hors AFK**. Après 2 minutes sans activité, le compteur s'arrête ;
   le temps hors connexion ou en spectateur ne compte pas.
3. Discord : `/parrainage statut` affiche le groupe et les paliers.
4. En jeu : `/parrainage` affiche la synchronisation, le temps et les clés.
   Les clés en réserve sont consommées directement en faisant un clic droit
   sur la caisse **Vote** (les clés physiques sont utilisées en premier).
5. Au palier final, rappeler son Dracolosse puis `/parrainage skin 1` pour
   le premier slot de l'équipe. `/parrainage retirer 1` retire le skin.
   Niveau, attaques et shiny sont conservés ; le skin ne se cumule pas avec Star.

## Paliers par défaut

| Filleuls validés dans le groupe | Clés Vote ajoutées par bénéficiaire |
| --- | --- |
| 1 | 1 |
| 3 | 2 |
| 5 | 3 |
| 10 | 5 + skin Alliance |

Chaque palier bénéficie au parrain et à **tous ses filleuls validés**.
Un filleul validé plus tard reçoit aussi les paliers déjà atteints par ce
groupe. Total par défaut : 11 clés et le skin. Pas de Pokémon gratuit.

## Administration Discord

- `/parrainage-admin config actif:true heures:5` : démarrer / reprendre.
- `/parrainage-admin config actif:false` : suspendre les nouvelles validations.
- `/parrainage-admin palier filleuls:3 cles:2` : prix des futurs déblocages.
- `/parrainage-admin attribuer filleul:@joueur parrain:@joueur` : réparer
  une nouvelle arrivée dont l'invitation est indéterminée. Impossible de
  réaffecter une arrivée déjà attribuée ou validée. Action journalisée.

L'identité Minecraft récompensée est figée ; retours sur Discord, changements
de compte lié, redémarrages et rejeux de synchronisation ne donnent pas de
récompense supplémentaire. Les récompenses acquises ne sont jamais révoquées.
Une attribution Discord ambiguë (arrivées simultanées / invitation introuvable)
reste à vérifier par le staff, pas de récompense arbitraire.

## Vérification

Les builds et tests automatiques ne remplacent pas un test de bout en bout
sur le vrai Discord, la base MySQL et le serveur Minecraft. Pour tester sans
attendre 5 h, un admin peut temporairement régler le minimum à **1 heure**,
puis le remettre à 5. Les récompenses déjà gagnées restent acquises.
