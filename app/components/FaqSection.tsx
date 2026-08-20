type FaqEntry = {
  question: string;
  answer: string;
};

type FaqSectionProps = {
  title: string;
  id: string;
  items: readonly FaqEntry[];
};

export default function FaqSection({ title, id, items }: FaqSectionProps) {
  return (
    <section id={id} aria-labelledby={`${id}-title`} className="legal-content">
      <div className="faq-heading">
        <span className="kicker">FAQ</span>
        <h2 id={`${id}-title`}>{title}</h2>
      </div>
      <div className="faq-list">
        {items.map((entry, index) => (
          <details key={entry.question}>
            <summary>
              <span>{String(index + 1).padStart(2, "0")}</span>
              <strong>{entry.question}</strong>
            </summary>
            <p>{entry.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
