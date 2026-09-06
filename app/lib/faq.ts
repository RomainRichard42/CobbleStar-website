import { SITE_NAME } from "@/app/lib/seo";

export type FaqEntry = {
  question: string;
  answer: string;
};

export const HOME_FAQ: ReadonlyArray<FaqEntry> = [
  {
    question: "Qu’est-ce que CobbleStar ?",
    answer: `CobbleStar est une communauté Minecraft centrée sur le mod ${SITE_NAME} (Cobblemon) en français, jouable avec Fabric sur la version 1.21.1.`,
  },
  {
    question: "À quel serveur dois-je me connecter ?",
    answer: `Entre l’adresse ${SITE_NAME} dans ton client : ${"play.cobblestar-mc.fr"}. Le launcher installe automatiquement la configuration nécessaire.`,
  },
  {
    question: "Ai-je besoin de payer pour télécharger le launcher ?",
    answer: "Non. Le launcher et le modpack d’installation sont gratuits.",
  },
  {
    question: "Puis-je rejoindre en simple et bon serveur vanilla ?",
    answer: "Le projet est basé sur Cobblemon : une version customisée qui demande des mods dédiés, le téléchargement se fait via le launcher dédié.",
  },
];

export const SHOP_FAQ: ReadonlyArray<FaqEntry> = [
  {
    question: "Comment fonctionnent les Stars sur CobbleStar ?",
    answer: "Les Stars sont une monnaie cosmétique. Elles servent à acheter des éléments visuels et des avantages d’affichage, pas de mécanique de combat payante.",
  },
  {
    question: "Puis-je utiliser la boutique sans compte ?",
    answer: "Tu peux consulter le catalogue, mais la liaison du compte Minecraft est nécessaire pour recevoir automatiquement les achats.",
  },
  {
    question: "Quels moyens de paiement sont utilisés ?",
    answer: "Les moyens de paiement proposés et le montant total sont affichés avant chaque validation. Aucun abonnement n’est ajouté à l’achat d’un pack de Stars.",
  },
];

export const VOTE_FAQ: ReadonlyArray<FaqEntry> = [
  {
    question: "Combien de votes faut-il pour avoir une récompense ?",
    answer: "Chaque portail de vote possède son propre cooldown. À l’obtention d’un vote validé, la récompense liée au mode de vote est préparée pour ton joueur.",
  },
  {
    question: "Peut-on voter sur plusieurs plateformes en même temps ?",
    answer: "Oui, lorsque les votes sont supportés et bien validés. Le cooldown est appliqué selon chaque portail afin d’éviter les abus.",
  },
  {
    question: "Pourquoi ma récompense n’arrive pas ?",
    answer: "Vérifie d’abord que ton compte Minecraft est bien lié sur ton profil CobbleStar, puis rejoins ensuite le lobby de récompense défini dans le jeu.",
  },
];

export const ACCOUNT_FAQ: ReadonlyArray<FaqEntry> = [
  {
    question: "Quelle est l’identité de mon compte CobbleStar ?",
    answer: "Après /link, ton UUID Minecraft est ton identifiant principal et ton pseudo reste le nom affiché. Changer de pseudo ou d’e-mail ne crée pas un nouveau profil. Discord reste le moyen de connexion.",
  },
  {
    question: "Puis-je récupérer mon profil avec un autre Discord ?",
    answer: "Oui, lorsque la récupération est activée : connecte le bon Discord, confirme le remplacement dans Mon compte puis exécute ta commande /link avec le joueur concerné. L’ancien accès Discord est révoqué. Les données du compte provisoire sont regroupées avec le profil récupéré ; celles de deux UUID Minecraft distincts ne sont jamais fusionnées.",
  },
  {
    question: "Mes données personnelles sont-elles récupérées ?",
    answer: "Seules les données utiles au service de connexion et de liaison sont conservées, comme précisé dans la politique de confidentialité.",
  },
  {
    question: "Comment fonctionne la connexion Discord ?",
    answer: "Discord confirme ton identité et t’ajoute au serveur officiel CobbleStar avec ton autorisation. CobbleStar conserve ton identifiant et ton profil Discord, mais jamais ton mot de passe ni le jeton de connexion Discord.",
  },
  {
    question: "Pourquoi dois-je encore utiliser /link en jeu ?",
    answer: "Discord confirme ton compte web ; la commande temporaire /link prouve que tu contrôles aussi le joueur Minecraft auquel seront envoyés tes Stars et récompenses.",
  },
];
