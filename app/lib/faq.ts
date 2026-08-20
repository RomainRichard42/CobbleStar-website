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
    answer: `Entre l’adresse ${SITE_NAME} dans ton client : ${"play.cobblestar-mc.fr"}. Le serveur est encore en phase de bêta privée selon les périodes d’ouverture.`,
  },
  {
    question: "Ai-je besoin de payer pour télécharger le launcher ?",
    answer: "Non. Le launcher et le modpack d’installation sont gratuits pendant la phase beta.",
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
    answer: "La plateforme n’active la monétisation que quand l’équipe le précise ; la page affiche l’état et les options disponibles au moment de l’ouverture.",
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
    question: "Puis-je utiliser le même pseudo Minecraft pour plusieurs comptes ?",
    answer: "Non, chaque UUID Minecraft ne peut être lié qu’à un seul compte du portail CobbleStar.",
  },
  {
    question: "Mes données personnelles sont-elles récupérées ?",
    answer: "Seules les données utiles au service de connexion et de liaison sont conservées, comme précisé dans la politique de confidentialité.",
  },
  {
    question: "Mon mot de passe est-il stocké en clair ?",
    answer: "Non, les mots de passe du portail web ne sont jamais conservés en clair ; ils sont protégés par des mécanismes standards côté serveur.",
  },
];
