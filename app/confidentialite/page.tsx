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
      <PageHero eyebrow="DONNÉES PERSONNELLES" title="Déclaration de" accent="confidentialité." description="Comment CobbleStar collecte, utilise et protège tes données lorsque tu utilises ce site et ton compte joueur." />
      <div className="legal-content">
        <section>
          <h2>1. Qui sommes-nous</h2>
          <p>CobbleStar (cobblestar-mc.fr) est un projet communautaire indépendant autour d’un serveur Minecraft Cobblemon, édité par Romain Richard. Pour toute question sur tes données personnelles, tu peux nous écrire à contact@cobblestar-mc.fr.</p>
        </section>

        <section>
          <h2>2. Données que nous collectons</h2>
          <p>Lorsque tu crées un compte sur le site, nous enregistrons ton adresse e-mail, un mot de passe stocké sous forme hachée (jamais en clair) et le pseudo Minecraft que tu indiques. Lorsque tu lies ton compte en jeu via la commande /link, ton UUID Minecraft officiel est associé à ton compte pour confirmer ton identité de joueur.</p>
          <p>Un cookie de session strictement nécessaire est déposé pour te garder connecté pendant 30 jours maximum. Ce cookie ne sert qu’à l’authentification, pas au suivi publicitaire.</p>
          <p>Pendant la bêta, les achats de la boutique (Stars) sont simulés : aucune donnée bancaire n’est collectée par CobbleStar. Le jour où un moyen de paiement réel sera activé, cette déclaration sera mise à jour pour préciser le prestataire de paiement utilisé et les données transmises.</p>
          <p>Nous n’utilisons aucun outil d’analyse d’audience ni de traceur publicitaire tiers sur le site.</p>
        </section>

        <section>
          <h2>3. Pourquoi nous utilisons ces données</h2>
          <p>Ces données servent uniquement à créer et sécuriser ton compte, te permettre de te connecter, associer ton profil web à ton joueur en jeu, livrer automatiquement les récompenses de vote ou les objets de boutique au bon compte Minecraft, et communiquer avec toi si nécessaire (support, sécurité du compte).</p>
        </section>

        <section>
          <h2>4. Base légale du traitement</h2>
          <p>Le traitement de ton e-mail, ton mot de passe et ton pseudo/UUID Minecraft est nécessaire à l’exécution du service que tu demandes en créant un compte (base légale : exécution d’un contrat, article 6.1.b du RGPD). Le cookie de session repose sur cette même nécessité technique.</p>
        </section>

        <section>
          <h2>5. Cookies</h2>
          <p>Le site utilise uniquement un cookie de session, essentiel au fonctionnement du compte, exempté de consentement au titre de la réglementation applicable. Aucun cookie de mesure d’audience ou publicitaire n’est déposé pour le moment.</p>
        </section>

        <section>
          <h2>6. Avec qui les données sont partagées</h2>
          <p>Tes données ne sont ni vendues ni partagées à des fins commerciales. Elles sont hébergées et transitent via des prestataires techniques nécessaires au fonctionnement du site : Cloudflare (gestion DNS et protection du trafic), Hostinger (réservation du nom de domaine) et Kinetic (hébergement de l’application et de la base de données). Ces prestataires agissent en tant que sous-traitants techniques et n’utilisent pas tes données à d’autres fins.</p>
        </section>

        <section>
          <h2>7. Durée de conservation</h2>
          <p>Tes données de compte sont conservées tant que ton compte reste actif. Si tu demandes la suppression de ton compte, tes données sont supprimées ou anonymisées dans un délai raisonnable, sauf obligation légale de conservation plus longue.</p>
        </section>

        <section>
          <h2>8. Sécurité</h2>
          <p>Les mots de passe sont hachés avant stockage, les cookies de session sont signés et les échanges avec le site sont chiffrés (HTTPS). Nous limitons l’accès aux données aux seules personnes en ayant besoin pour faire fonctionner CobbleStar.</p>
        </section>

        <section>
          <h2>9. Tes droits</h2>
          <p>Conformément au RGPD, tu disposes d’un droit d’accès, de rectification, d’effacement, de limitation et d’opposition concernant tes données, ainsi que d’un droit à la portabilité. Pour exercer ces droits, écris-nous à contact@cobblestar-mc.fr. Tu peux aussi introduire une réclamation auprès de la CNIL (cnil.fr) si tu estimes que tes droits ne sont pas respectés.</p>
        </section>

        <section>
          <h2>10. Mineurs</h2>
          <p>Minecraft est largement utilisé par un public mineur. Si tu as moins de 15 ans, la création d’un compte doit se faire avec l’accord d’un parent ou tuteur légal, conformément à la réglementation applicable au traitement des données des mineurs.</p>
        </section>

        <section>
          <h2>11. Mise à jour de cette déclaration</h2>
          <p>Cette déclaration peut évoluer, notamment à l’ouverture des paiements réels ou de nouvelles fonctionnalités. La date de dernière mise à jour est indiquée ci-dessous.</p>
          <p className="legal-date">Dernière mise à jour : 4 août 2026.</p>
        </section>
      </div>
      <SiteFooter />
    </main>
  );
}
