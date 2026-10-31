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
    answer: "Les Stars sont la monnaie virtuelle de la boutique : cosmétiques, services, collections et grades mensuels. Chaque offre présente ses avantages en jeu avant l’achat.",
  },
  {
    question: "Puis-je utiliser la boutique sans compte ?",
    answer: "Tu peux consulter le catalogue, mais la liaison du compte Minecraft est nécessaire pour recevoir automatiquement les achats.",
  },
  {
    question: "Quels moyens de paiement sont utilisés ?",
    answer: "Le paiement par carte s’effectue sur la page sécurisée de Stripe, avec le montant total affiché avant validation. Un pack de Stars est un achat unique, sans abonnement ni prélèvement récurrent. Le compte Minecraft lié reçoit les Stars après confirmation du paiement.",
  },
  {
    question: "Quand pourrai-je utiliser mes Stars en jeu ?",
    answer: "Le serveur est en préouverture. Les grades, les jetons et les autres offres seront accessibles dans /boutique en jeu à l’ouverture du serveur. Une recharge de Stars ne donne pas un accès anticipé au serveur.",
  },
  {
    question: "Comment acheter et renouveler un grade ?",
    answer: "Recharge tes Stars, puis achète ton grade dans /boutique en jeu : Étoilé coûte 1 000 Stars, Cosmique 2 200 et Galactique 3 300 pour un mois. Le renouvellement est manuel, sans prélèvement automatique. Les commandes F2P non acquises restent verrouillées ; tes acquis F2P et tes données sont conservés à l’expiration. Les cadeaux éventuels ne sont offerts qu’au premier achat de chaque grade.",
  },
];

export const VOTE_FAQ: ReadonlyArray<FaqEntry> = [
  {
    question: "Combien de votes faut-il pour avoir une récompense ?",
    answer: "Un vote confirmé depuis cette page rapporte une clé pour la machine Vote. Prépare ton vote, termine-le sur l’annuaire avec ton pseudo Minecraft, puis reviens vérifier sa validation. Ouvrir le lien seul ne donne aucune clé.",
  },
  {
    question: "Peut-on voter sur plusieurs plateformes en même temps ?",
    answer: "Oui. Top-Serveurs permet un vote toutes les 2 heures, Serveur-Privé toutes les 1 h 30 et ServeursMinecraft.org toutes les 24 heures. Chaque annuaire applique aussi ses règles de connexion et de réseau.",
  },
  {
    question: "Pourquoi ma récompense n’arrive pas ?",
    answer: "Vérifie que ton compte Minecraft est lié et que le vote est indiqué comme validé ici. La clé est ensuite livrée automatiquement en jeu. Si tu es hors ligne, elle reste en attente de ta prochaine connexion. Le serveur est actuellement en préouverture.",
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
