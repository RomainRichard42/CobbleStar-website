import type { Metadata } from "next";
import PageHero from "../components/PageHero";
import SiteFooter from "../components/SiteFooter";

export const metadata: Metadata = {
  title: "Confidentialité — CobbleStar",
  description: "Déclaration de confidentialité de CobbleStar : données collectées, finalités, cookies et droits RGPD.",
};

export default function ConfidentialitePage() {
  return (
    <main>
      <PageHero eyebrow="DONNÉES PERSONNELLES" title="Déclaration de" accent="confidentialité." description="Comment CobbleStar collecte, utilise et protège tes données lorsque tu utilises ce site et ton compte joueur." image="/cobblemon-berries.webp" variant="legal" />
      <div className="legal-content">
        <nav className="legal-summary" aria-label="Sommaire de la déclaration">
          <span>LECTURE RAPIDE</span>
          <h2>Ce qui compte pour toi</h2>
          <div><a href="#donnees">Données collectées</a><a href="#cookies">Cookies</a><a href="#partage">Partage</a><a href="#droits">Tes droits</a></div>
          <p>Pas de publicité, pas de revente de données et aucun mot de passe Discord ou Microsoft demandé.</p>
        </nav>
        <section id="identite">
          <h2>1. Qui sommes-nous</h2>
          <p>CobbleStar (cobblestar-mc.fr) est un projet communautaire indépendant autour d’un serveur Minecraft Cobblemon, édité par Romain Richard. Pour toute question sur tes données personnelles, tu peux nous écrire à contact@cobblestar-mc.fr.</p>
        </section>

        <section id="donnees">
          <h2>2. Données que nous collectons</h2>
          <p>Lorsque tu te connectes avec Discord, nous enregistrons ton identifiant Discord, ton pseudo, ton nom affiché, ton avatar et, lorsqu’il est disponible et vérifié par Discord, ton adresse e-mail. Avec ton autorisation, le même parcours t’ajoute au serveur Discord officiel CobbleStar. Nous ne recevons jamais ton mot de passe Discord et le jeton OAuth utilisé pour lire ton profil et effectuer cette adhésion n’est pas conservé.</p>
          <p>Lorsque tu lies ton compte en jeu via la commande temporaire /link, ton pseudo et ton UUID Minecraft officiel sont associés à ce même compte Discord pour confirmer ton identité de joueur.</p>
          <p>Pour le support et l’administration du serveur, la passerelle de jeu peut également transmettre ton UUID, ton pseudo, tes connexions et déconnexions, ta position, tes statistiques Minecraft, tes inventaires, tes Pokémon et ta progression CobbleStar. Ces relevés sont réservés aux administrateurs autorisés. Ils n’incluent pas les messages privés, les mots de passe ou une collecte de fichiers personnels sur ton appareil.</p>
          <p>Un cookie de session strictement nécessaire est déposé pour te garder connecté pendant 30 jours maximum. Un second cookie signé, supprimé après quelques minutes, sécurise uniquement le retour depuis Discord. Aucun des deux ne sert au suivi publicitaire.</p>
          <p>Les données bancaires ne sont pas stockées directement par CobbleStar. Elles sont traitées par le prestataire de paiement présenté au moment du règlement, selon ses propres mesures de sécurité et obligations légales.</p>
          <p>Nous n’utilisons aucun outil d’analyse d’audience ni de traceur publicitaire tiers sur le site.</p>
        </section>

        <section id="finalites">
          <h2>3. Pourquoi nous utilisons ces données</h2>
          <p>Ces données servent uniquement à créer et sécuriser ton compte via Discord, t’ajouter à la communauté Discord CobbleStar, associer ton profil web à ton joueur en jeu, livrer automatiquement les récompenses de vote ou les objets de boutique au bon compte Minecraft, et communiquer avec toi si nécessaire pour le support ou la sécurité du compte.</p>
        </section>

        <section id="base-legale">
          <h2>4. Base légale du traitement</h2>
          <p>Le traitement de ton identité Discord et de ton pseudo/UUID Minecraft est nécessaire à l’exécution du service que tu demandes en utilisant l’espace joueur (base légale : exécution d’un contrat, article 6.1.b du RGPD). Les cookies techniques de session et de sécurisation OAuth reposent sur cette même nécessité.</p>
        </section>

        <section id="cookies">
          <h2>5. Cookies</h2>
          <p>Le site utilise un cookie de session essentiel au fonctionnement du compte et un cookie OAuth temporaire qui empêche qu’un retour Discord soit détourné. Ces cookies strictement nécessaires sont exemptés de consentement. Aucun cookie de mesure d’audience ou publicitaire n’est déposé.</p>
        </section>

        <section id="partage">
          <h2>6. Avec qui les données sont partagées</h2>
          <p>Tes données ne sont ni vendues ni partagées à des fins commerciales. Discord intervient comme fournisseur d’identité et pour effectuer ton adhésion au serveur communautaire CobbleStar avec ton autorisation. Les données sont ensuite hébergées et transitent via les prestataires techniques nécessaires au fonctionnement du site : Cloudflare, Hostinger et Kinetic.</p>
        </section>

        <section id="conservation">
          <h2>7. Durée de conservation</h2>
          <p>Tes données de compte sont conservées tant que ton compte reste actif. Si tu demandes la suppression de ton compte, tes données sont supprimées ou anonymisées dans un délai raisonnable, sauf obligation légale de conservation plus longue.</p>
          <p>Le journal d’activité de jeu est conservé pendant 90 jours, et le journal des interventions administrateur pendant 365 jours. La fiche de jeu contient le dernier état synchronisé ; elle ne constitue pas un enregistrement de chaque geste du joueur.</p>
        </section>

        <section id="securite">
          <h2>8. Sécurité</h2>
          <p>CobbleStar ne stocke aucun mot de passe pour les comptes Discord. Les états OAuth sont temporaires et signés, les cookies de session sont protégés et les échanges avec le site sont chiffrés avec HTTPS. Nous limitons l’accès aux données aux seules personnes en ayant besoin pour faire fonctionner CobbleStar.</p>
        </section>

        <section id="droits">
          <h2>9. Tes droits</h2>
          <p>Conformément au RGPD, tu disposes d’un droit d’accès, de rectification, d’effacement, de limitation et d’opposition concernant tes données, ainsi que d’un droit à la portabilité. Pour exercer ces droits, écris-nous à contact@cobblestar-mc.fr. Tu peux aussi introduire une réclamation auprès de la CNIL (cnil.fr) si tu estimes que tes droits ne sont pas respectés.</p>
        </section>

        <section id="mineurs">
          <h2>10. Mineurs</h2>
          <p>Minecraft est largement utilisé par un public mineur. Si tu as moins de 15 ans, la création d’un compte doit se faire avec l’accord d’un parent ou tuteur légal, conformément à la réglementation applicable au traitement des données des mineurs.</p>
        </section>

        <section id="mise-a-jour">
          <h2>11. Mise à jour de cette déclaration</h2>
          <p>Cette déclaration peut évoluer lorsque les services, prestataires ou obligations applicables changent. La date de dernière mise à jour est indiquée ci-dessous.</p>
          <p className="legal-date">Dernière mise à jour : 6 septembre 2026.</p>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
