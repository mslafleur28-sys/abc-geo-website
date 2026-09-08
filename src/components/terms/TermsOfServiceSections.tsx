import { TERMS_SECTIONS } from '@/components/terms/termsContent';

export function TermsOfServiceSections() {
  return (
    <div className="space-y-10">
      {TERMS_SECTIONS.map((section) => (
        <section
          key={section.id}
          id={section.id}
          className="scroll-mt-28"
          aria-labelledby={`${section.id}-heading`}
        >
          <h2
            id={`${section.id}-heading`}
            className="font-display text-2xl font-bold tracking-tight text-abby-ink"
          >
            {section.title}
          </h2>
          <div className="mt-4 space-y-3 text-[1.02rem] leading-relaxed text-abby-ink/90">
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph.slice(0, 56)}>{paragraph}</p>
            ))}
          </div>
          {section.bullets?.length ? (
            <ul className="mt-4 list-disc space-y-2 pl-5 text-[1.02rem] leading-relaxed text-abby-ink/90">
              {section.bullets.map((bullet) => (
                <li key={bullet.slice(0, 56)}>{bullet}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
    </div>
  );
}
