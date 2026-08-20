import { SITE_URL } from "@/app/lib/seo";

type FaqEntry = {
  question: string;
  answer: string;
};

type FaqStructuredDataProps = {
  faqItems: readonly FaqEntry[];
  pageUrl: string;
};

export default function FaqStructuredData({ faqItems, pageUrl }: FaqStructuredDataProps) {
  const faqPageStructuredData = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "@id": `${SITE_URL}${pageUrl}#faq`,
    url: `${SITE_URL}${pageUrl}`,
    inLanguage: "fr-FR",
    mainEntity: faqItems.map((entry) => ({
      "@type": "Question",
      name: entry.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: entry.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(faqPageStructuredData) }}
    />
  );
}
