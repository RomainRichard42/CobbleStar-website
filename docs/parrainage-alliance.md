# Parrainage Discord / Minecraft — Dracolosse Alliance

## Livraison

Serveur CobbleStar 6.47.23, Minecraft 1.21.1 / Cobblemon 1.8.0.
Le skin (textures et resolver, rig natif inchangé) est inclus dans le pack
serveur obligatoire de l'API. Il n'est pas une espèce Star et ne change pas
les spawns. Aucune mise à jour client n'est nécessaire pour ce seul skin.

Redémarrer l'API après son déploiement pour appliquer les migrations 017/018 et
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
   sur la caisse **Vote** ou **Pulsar** (les clés physiques sont utilisées en premier).
   Les objets et Cobblecoins sont remis automatiquement si l'inventaire a de
   la place ; sinon `/parrainage recuperer`. Les Cobblecoins vont dans l'économie
   du jeu, pas dans le portefeuille Stars du site.
5. Au palier final, rappeler son Dracolosse puis `/parrainage skin 1` pour
   le premier slot de l'équipe. `/parrainage retirer 1` retire le skin.
   Niveau, attaques et shiny sont conservés ; le skin ne se cumule pas avec Star.

## Paliers par défaut

| Filleuls validés pour le parrain | Récompense du parrain uniquement |
| --- | --- |
| 1 | 1 |
| 2 | 2 |
| 3 | 3 |
| 4 | 5 + skin Alliance |

Chaque filleul doit jouer 5 h hors AFK pour compter. Le parrain n'a pas de
condition de temps de jeu personnel. Total parrain : 11 clés Vote + le skin.

| Temps propre du filleul hors AFK | Récompense du filleul uniquement |
| --- | --- |
| 1 h | 10 Super Balls |
| 3 h | 5 Bonbons Exp. L |
| 5 h | 15 Hyper Balls + 5 000 Cobblecoins |
| 10 h | 5 Bonbons Exp. XL + 10 000 Cobblecoins + 1 clé Pulsar |

Les deux parcours sont indépendants et cumulatifs, une seule remise de
chaque palier par compte Minecraft. Le filleul ne reçoit pas les paliers
du parrain ni le skin Alliance avec cette nouvelle règle. Pas de Pokémon gratuit.
Les droits déjà acquis en 6.47.22 restent conservés. La migration déduit les
anciens paliers Vote du parrain : pas de paiement en double lors du passage
aux paliers 1/2/3/4. Les nouveaux filleuls ne reçoivent que le nouveau parcours.

## Administration Discord

- `/parrainage-admin config actif:true heures:5` : démarrer / reprendre.
- `/parrainage-admin config actif:false` : suspendre les nouvelles validations.
- `/parrainage-admin palier filleuls:2 cles:2` : clés des futurs paliers parrain.
- `/parrainage-admin attribuer filleul:@joueur parrain:@joueur` : réparer
  une nouvelle arrivée dont l'invitation est indéterminée. Impossible de
  réaffecter une arrivée déjà attribuée ou validée. Action journalisée.

L'identité Minecraft récompensée est figée ; retours sur Discord, changements
de compte lié, redémarrages et rejeux de synchronisation ne donnent pas de
récompense supplémentaire. Les récompenses acquises ne sont jamais révoquées.
Une attribution Discord ambiguë (arrivées simultanées / invitation introuvable)
reste à vérifier par le staff, pas de récompense arbitraire.

### Remise interrompue (incident serveur)

Les objets et crédits sont précédés d'une réservation persistante, puis
l'image du joueur est sauvegardée. Si une interruption rend la remise ambiguë,
elle n'est jamais rejouée automatiquement : le joueur et les logs préviennent
le staff. Après vérification de l'inventaire ET du crédit économique :

- `/parrainage admin <joueur> <palier 1..4> valider` : la remise a bien eu lieu.
- `/parrainage admin <joueur> <palier 1..4> reessayer confirmer` : réautoriser
  uniquement si le staff a confirmé qu'aucun objet ni crédit n'a été reçu
  (ou a annulé la remise partielle). Action réservée OP niveau 2, journalisée.

## Vérification

Les builds et tests automatiques ne remplacent pas un test de bout en bout
sur le vrai Discord, la base MySQL et le serveur Minecraft. Pour tester sans
attendre 5 h, un admin peut temporairement régler le minimum à **1 heure**,
puis le remettre à 5. Les récompenses déjà gagnées restent acquises.
