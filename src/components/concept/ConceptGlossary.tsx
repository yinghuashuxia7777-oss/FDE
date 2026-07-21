import { useMemo, useState } from 'react';

import type { ConceptKnowledge } from '../../domain/concepts/types';
import { useI18n } from '../../i18n';
import { localizeConcepts } from '../../i18n/content-localization';

interface ConceptGlossaryProps {
  concepts: readonly ConceptKnowledge[];
  title?: string;
  compact?: boolean;
  headingLevel?: 2 | 3;
}

export function ConceptGlossary({
  concepts,
  title,
  compact = false,
  headingLevel = 2,
}: ConceptGlossaryProps) {
  const { language, t } = useI18n();
  const [selectedId, setSelectedId] = useState<string>();
  const [familiarIds, setFamiliarIds] = useState<ReadonlySet<string>>(
    () => new Set(),
  );
  const localizedConcepts = useMemo(
    () => localizeConcepts(concepts, language),
    [concepts, language],
  );
  const selected = useMemo(
    () => localizedConcepts.find(({ id }) => id === selectedId),
    [localizedConcepts, selectedId],
  );

  if (localizedConcepts.length === 0) return null;
  const Heading = headingLevel === 2 ? 'h2' : 'h3';

  const openConcept = (id: string) => {
    setSelectedId((current) => (current === id ? undefined : id));
    setFamiliarIds((current) => {
      if (current.has(id)) return current;
      const next = new Set(current);
      next.add(id);
      return next;
    });
  };

  const openSuggestedConcept = () => {
    const concept = selected ?? localizedConcepts[0];
    if (concept === undefined) return;
    setSelectedId(concept.id);
    setFamiliarIds((current) => {
      if (current.has(concept.id)) return current;
      const next = new Set(current);
      next.add(concept.id);
      return next;
    });
  };
  const suggestedConcept = selected ?? localizedConcepts[0];
  const suggestedExplanationId =
    suggestedConcept === undefined
      ? undefined
      : `concept-explanation-${suggestedConcept.id}`;

  return (
    <section
      className={`concept-glossary${compact ? ' concept-glossary--compact' : ''}`}
      aria-label={title ?? t('concept.glossary.title')}
    >
      <header className="concept-glossary__header">
        <Heading>{title ?? t('concept.glossary.title')}</Heading>
        <button
          className="button button--secondary concept-glossary__view"
          type="button"
          aria-controls={suggestedExplanationId}
          aria-expanded={selected !== undefined}
          onClick={openSuggestedConcept}
        >
          {t('concept.glossary.viewExplanation')}
        </button>
      </header>
      <ul className="plain-list concept-glossary__terms">
        {localizedConcepts.map((concept) => {
          const expanded = selectedId === concept.id;
          const explanationId = `concept-explanation-${concept.id}`;
          return (
            <li key={concept.id}>
              <button
                className="concept-term"
                type="button"
                aria-controls={explanationId}
                aria-expanded={expanded}
                onClick={() => openConcept(concept.id)}
              >
                {familiarIds.has(concept.id) || language === 'en-US' ? (
                  <span lang="en">{concept.technicalTerm}</span>
                ) : (
                  <>
                    <span lang="zh-CN">{concept.title}</span>（
                    <span lang="en">{concept.technicalTerm}</span>）
                  </>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      {selected === undefined ? null : (
        <div
          aria-live="polite"
          className="concept-glossary__explanation"
          id={`concept-explanation-${selected.id}`}
        >
          <dl>
            <div>
              <dt>{t('concept.glossary.simpleExplanation')}</dt>
              <dd lang={language}>{selected.simpleExplanation}</dd>
            </div>
            <div>
              <dt>{t('concept.glossary.whyItMatters')}</dt>
              <dd lang={language}>{selected.whyItMatters}</dd>
            </div>
            {compact ? null : (
              <>
                <div>
                  <dt>{t('concept.glossary.analogy')}</dt>
                  <dd lang={language}>{selected.analogy}</dd>
                </div>
                <div>
                  <dt>{t('concept.glossary.technicalExplanation')}</dt>
                  <dd lang={language}>{selected.technicalExplanation}</dd>
                </div>
                <div>
                  <dt>{t('concept.glossary.commonMistakes')}</dt>
                  <dd lang={language}>{selected.commonMistakes}</dd>
                </div>
              </>
            )}
          </dl>
        </div>
      )}
    </section>
  );
}
