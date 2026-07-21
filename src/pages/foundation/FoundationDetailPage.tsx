import { useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react';
import { Link } from 'react-router-dom';

import { foundationStatus } from '../../application/foundation';
import { conceptsForFoundation } from '../../application/concepts';
import { selectJourneyNextFoundation } from '../../application/onboarding';
import {
  masteryStatus,
  type ProductRepositories,
  useAsyncPageData,
  useProductRepositories,
} from '../../application/product';
import {
  bundledConceptSource,
  type ConceptSource,
} from '../../content/concept-source';
import {
  bundledFoundationSource,
  type FoundationSource,
} from '../../content/foundation-source';
import { ConceptGlossary } from '../../components/concept';
import { JourneyNextStep } from '../../components/onboarding';
import { StatusBadge } from '../../components/ui';
import type { ConceptKnowledge } from '../../domain/concepts/types';
import type { FoundationLearningStatus } from '../../domain/foundation/types';
import { useI18n } from '../../i18n';
import {
  LOCAL_USER_ID,
  type AttemptRecord,
  type CaseSummary,
  type SkillMasteryRecord,
} from '../../repositories/contracts';
import { AsyncPage, PageHeader } from '../shared';

interface FoundationDetailPageProps {
  conceptSource?: ConceptSource;
  foundationId: string;
  foundationSource?: FoundationSource;
  repositories?: ProductRepositories;
}

const foundationStatusKeys: Record<FoundationLearningStatus, string> = {
  'not-started': 'foundation.status.notStarted',
  learning: 'foundation.status.learning',
  mastered: 'foundation.status.mastered',
};

const masteryStatusKeys = {
  'Not started': 'product.common.mastery.notStarted',
  Weak: 'product.common.mastery.weak',
  Learning: 'product.common.mastery.learning',
  Competent: 'product.common.mastery.competent',
  Proficient: 'product.common.mastery.proficient',
} as const;

function foundationTone(status: FoundationLearningStatus) {
  if (status === 'mastered') return 'success' as const;
  if (status === 'learning') return 'warning' as const;
  return 'neutral' as const;
}

function navigateToChapter(
  event: ReactMouseEvent<HTMLAnchorElement>,
  chapterId: string,
) {
  event.preventDefault();
  const target = document.getElementById(chapterId);
  if (target === null) return;
  target.focus({ preventScroll: true });
  target.scrollIntoView?.({ block: 'start' });
}

function RelatedConceptPanel({
  cases,
  conceptSource,
  foundationId,
}: {
  cases: readonly CaseSummary[];
  conceptSource: ConceptSource;
  foundationId: string;
}) {
  const { t } = useI18n();
  const [snapshot, setSnapshot] = useState<{
    concepts: readonly ConceptKnowledge[];
    foundationId: string;
    source: ConceptSource;
  }>();

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => conceptSource.loadAll())
      .then(
        (items) => {
          if (!active) return;
          setSnapshot({
            concepts: conceptsForFoundation(items, foundationId),
            foundationId,
            source: conceptSource,
          });
        },
        () => {
          // Concept guidance is advisory; Foundation content remains usable.
        },
      );
    return () => {
      active = false;
    };
  }, [conceptSource, foundationId]);

  const concepts =
    snapshot?.source === conceptSource && snapshot.foundationId === foundationId
      ? snapshot.concepts
      : [];
  if (concepts.length === 0) return null;
  const activeCaseById = new Map(
    cases
      .filter(({ status }) => status === 'published')
      .map((candidate) => [candidate.id, candidate]),
  );
  const nextCase = concepts
    .flatMap(({ relatedCases }) => relatedCases)
    .map((caseId) => activeCaseById.get(caseId))
    .find((candidate) => candidate !== undefined);

  return (
    <section className="panel foundation-support-panel foundation-concept-panel">
      <ConceptGlossary
        concepts={concepts}
        title={t('concept.glossary.relatedTitle')}
      />
      {nextCase === undefined ? null : (
        <JourneyNextStep
          actionLabel={t('onboarding.nextStep.openCase', {
            title: nextCase.title,
          })}
          description={t('onboarding.nextStep.reason', {
            reason: nextCase.scenarioSummary ?? nextCase.summary,
          })}
          lead={t('onboarding.nextStep.conceptLead')}
          title={nextCase.title}
          to={`/training/${nextCase.id}`}
        />
      )}
    </section>
  );
}

function FoundationNextStepPanel({
  attempts,
  currentId,
  foundationSource,
  mastery,
}: {
  attempts: readonly AttemptRecord[];
  currentId: string;
  foundationSource: FoundationSource;
  mastery: readonly SkillMasteryRecord[];
}) {
  const { t } = useI18n();
  const [snapshot, setSnapshot] = useState<{
    currentId: string;
    next: Awaited<ReturnType<FoundationSource['findById']>>;
    source: FoundationSource;
  }>();

  useEffect(() => {
    let active = true;
    void Promise.resolve()
      .then(() => foundationSource.loadAll())
      .then(
        (items) => {
          if (!active) return;
          setSnapshot({
            currentId,
            next: selectJourneyNextFoundation(
              currentId,
              items,
              mastery,
              attempts,
            ),
            source: foundationSource,
          });
        },
        () => {
          // Recommendation is advisory; authored content stays usable.
        },
      );
    return () => {
      active = false;
    };
  }, [attempts, currentId, foundationSource, mastery]);

  const next =
    snapshot?.source === foundationSource && snapshot.currentId === currentId
      ? snapshot.next
      : undefined;
  if (next === undefined) return null;

  return (
    <JourneyNextStep
      actionLabel={t('onboarding.nextStep.openFoundation', {
        title: next.title,
      })}
      description={t('onboarding.nextStep.reason', {
        reason: next.content.simpleExplanation,
      })}
      lead={t('onboarding.nextStep.foundationLead')}
      title={next.title}
      to={`/foundation/${next.id}`}
    />
  );
}

export function FoundationDetailPage({
  conceptSource = bundledConceptSource,
  foundationId,
  foundationSource = bundledFoundationSource,
  repositories: override,
}: FoundationDetailPageProps) {
  const { t } = useI18n();
  const getRepositories = useProductRepositories(override);
  const { state, retry } = useAsyncPageData(async () => {
    const source = await getRepositories();
    const [item, mastery, attempts, skillDefinitions, cases] =
      await Promise.all([
        foundationSource.findById(foundationId),
        source.skills.list(LOCAL_USER_ID),
        source.attempts.list({ userId: LOCAL_USER_ID }),
        source.content.listActiveSkills(),
        source.cases.listActive({ status: 'published' }),
      ]);
    return {
      item,
      mastery,
      attempts,
      skillDefinitions,
      cases,
    };
  }, [foundationId, foundationSource, getRepositories]);
  const readyItem = state.status === 'ready' ? state.data.item : undefined;
  const notFound = state.status === 'ready' && readyItem === undefined;
  const unavailable = state.status === 'error';

  return (
    <section className="product-page" aria-labelledby="page-title">
      <PageHeader
        eyebrow={t(
          notFound
            ? 'foundation.notFound.eyebrow'
            : 'foundation.detail.eyebrow',
        )}
        title={
          readyItem?.title ??
          t(
            notFound
              ? 'foundation.notFound.title'
              : unavailable
                ? 'foundation.detail.unavailableTitle'
                : 'foundation.detail.loadingTitle',
          )
        }
        description={t(
          notFound
            ? 'foundation.notFound.description'
            : 'foundation.detail.description',
        )}
      />
      <AsyncPage state={state} retry={retry}>
        {({ item, mastery, attempts, skillDefinitions, cases }) => {
          if (item === undefined) {
            return (
              <div className="panel">
                <Link className="button button--secondary" to="/foundation">
                  {t('foundation.notFound.back')}
                </Link>
              </div>
            );
          }

          const status = foundationStatus(item, mastery, attempts);
          const masteryBySkill = new Map(
            mastery.map((record) => [record.skillId, record]),
          );
          const skillById = new Map(
            skillDefinitions
              .filter((definition) => definition.status === 'active')
              .map((definition) => [definition.id, definition]),
          );
          const activeSkills = item.skills.flatMap((skillId) => {
            const definition = skillById.get(skillId);
            return definition === undefined ? [] : [definition];
          });
          const activeCaseById = new Map(
            cases
              .filter((candidate) => candidate.status === 'published')
              .map((candidate) => [candidate.id, candidate]),
          );
          const relatedCases = item.relatedCases.flatMap((caseId) => {
            const candidate = activeCaseById.get(caseId);
            return candidate === undefined ? [] : [candidate];
          });

          return (
            <div className="product-stack foundation-detail-stack">
              <div className="button-row">
                <Link className="button button--secondary" to="/foundation">
                  {t('foundation.detail.back')}
                </Link>
              </div>
              <dl className="compact-facts foundation-facts">
                <div>
                  <dt>{t('foundation.detail.level')}</dt>
                  <dd>{t(`product.common.level.${item.level}`)}</dd>
                </div>
                <div>
                  <dt>{t('foundation.detail.time')}</dt>
                  <dd>
                    {t('product.common.minutesShort', {
                      minutes: item.estimatedMinutes,
                    })}
                  </dd>
                </div>
                <div>
                  <dt>{t('foundation.detail.status')}</dt>
                  <dd>
                    <StatusBadge tone={foundationTone(status)}>
                      {t(foundationStatusKeys[status])}
                    </StatusBadge>
                  </dd>
                </div>
              </dl>

              <aside
                className="panel product-stack foundation-reading-note"
                role="note"
                aria-labelledby="foundation-reading-note-title"
              >
                <h2 id="foundation-reading-note-title">
                  {t('foundation.detail.readingNoteTitle')}
                </h2>
                <p>{t('foundation.detail.readingNoteBody')}</p>
              </aside>

              <div className="foundation-detail-layout">
                <article className="foundation-reading panel">
                  <nav
                    className="foundation-chapter-nav"
                    aria-label={t('foundation.detail.chapterNavigation')}
                  >
                    <ol>
                      <li>
                        <a
                          href="#foundation-chapter-simple-explanation"
                          onClick={(event) =>
                            navigateToChapter(
                              event,
                              'foundation-chapter-simple-explanation',
                            )
                          }
                        >
                          {t('foundation.detail.simpleExplanation')}
                        </a>
                      </li>
                      <li>
                        <a
                          href="#foundation-chapter-analogy"
                          onClick={(event) =>
                            navigateToChapter(
                              event,
                              'foundation-chapter-analogy',
                            )
                          }
                        >
                          {t('foundation.detail.analogy')}
                        </a>
                      </li>
                      <li>
                        <a
                          href="#foundation-chapter-technical-explanation"
                          onClick={(event) =>
                            navigateToChapter(
                              event,
                              'foundation-chapter-technical-explanation',
                            )
                          }
                        >
                          {t('foundation.detail.technicalExplanation')}
                        </a>
                      </li>
                      <li>
                        <a
                          href="#foundation-chapter-example"
                          onClick={(event) =>
                            navigateToChapter(
                              event,
                              'foundation-chapter-example',
                            )
                          }
                        >
                          {t('foundation.detail.example')}
                        </a>
                      </li>
                      <li>
                        <a
                          href="#foundation-chapter-common-mistakes"
                          onClick={(event) =>
                            navigateToChapter(
                              event,
                              'foundation-chapter-common-mistakes',
                            )
                          }
                        >
                          {t('foundation.detail.commonMistakes')}
                        </a>
                      </li>
                    </ol>
                  </nav>
                  <section
                    className="foundation-reading__section"
                    data-foundation-chapter="simple-explanation"
                    id="foundation-chapter-simple-explanation"
                    tabIndex={-1}
                  >
                    <h2>{t('foundation.detail.simpleExplanation')}</h2>
                    <p>{item.content.simpleExplanation}</p>
                  </section>
                  <section
                    className="foundation-reading__section"
                    data-foundation-chapter="analogy"
                    id="foundation-chapter-analogy"
                    tabIndex={-1}
                  >
                    <h2>{t('foundation.detail.analogy')}</h2>
                    <p>{item.content.analogy}</p>
                  </section>
                  <section
                    className="foundation-reading__section"
                    data-foundation-chapter="technical-explanation"
                    id="foundation-chapter-technical-explanation"
                    tabIndex={-1}
                  >
                    <h2>{t('foundation.detail.technicalExplanation')}</h2>
                    <p>{item.content.technicalExplanation}</p>
                  </section>
                  <section
                    className="foundation-reading__section"
                    data-foundation-chapter="example"
                    id="foundation-chapter-example"
                    tabIndex={-1}
                  >
                    <h2>{t('foundation.detail.example')}</h2>
                    <p>{item.content.example}</p>
                  </section>
                  <section
                    className="foundation-reading__section"
                    data-foundation-chapter="common-mistakes"
                    id="foundation-chapter-common-mistakes"
                    tabIndex={-1}
                  >
                    <h2>{t('foundation.detail.commonMistakes')}</h2>
                    <p>{item.content.commonMistakes}</p>
                  </section>
                  <FoundationNextStepPanel
                    attempts={attempts}
                    currentId={item.id}
                    foundationSource={foundationSource}
                    mastery={mastery}
                  />
                </article>

                <aside className="foundation-detail-aside">
                  <section
                    className="panel foundation-support-panel"
                    aria-labelledby="foundation-skills-title"
                  >
                    <h2 id="foundation-skills-title">
                      {t('foundation.detail.skills')}
                    </h2>
                    {activeSkills.length === 0 ? (
                      <p>{t('foundation.detail.noActiveSkills')}</p>
                    ) : (
                      <dl className="foundation-skill-list">
                        {activeSkills.map((skill) => {
                          const record = masteryBySkill.get(skill.id);
                          const skillStatus = masteryStatus(
                            record?.score,
                            record?.sampleCount,
                          );
                          return (
                            <div key={skill.id}>
                              <dt>{skill.label}</dt>
                              <dd>
                                <span>
                                  {record === undefined
                                    ? t('product.common.notAvailable')
                                    : `${Math.round(record.score)} / 100`}
                                </span>
                                <StatusBadge
                                  tone={
                                    skillStatus === 'Weak'
                                      ? 'warning'
                                      : 'neutral'
                                  }
                                >
                                  {t(masteryStatusKeys[skillStatus])}
                                </StatusBadge>
                              </dd>
                            </div>
                          );
                        })}
                      </dl>
                    )}
                  </section>

                  <RelatedConceptPanel
                    cases={cases}
                    conceptSource={conceptSource}
                    foundationId={foundationId}
                  />

                  <section
                    className="panel foundation-support-panel"
                    aria-labelledby="foundation-related-cases-title"
                  >
                    <div>
                      <h2 id="foundation-related-cases-title">
                        {t('foundation.detail.relatedCases')}
                      </h2>
                      <p>{t('foundation.detail.relatedCasesDescription')}</p>
                      <p>
                        {t('foundation.detail.learned', { title: item.title })}
                      </p>
                      <strong>
                        {t('foundation.detail.recommendedPractice')}
                      </strong>
                    </div>
                    {relatedCases.length === 0 ? (
                      <p>{t('foundation.detail.noActiveCases')}</p>
                    ) : (
                      <ul className="plain-list foundation-related-list">
                        {relatedCases.map((candidate) => (
                          <li key={candidate.id}>
                            <Link
                              className="button button--secondary"
                              to={`/training/${candidate.id}`}
                            >
                              {t('foundation.detail.startCase', {
                                title: candidate.title,
                              })}
                            </Link>
                            <p>
                              {candidate.scenarioSummary ?? candidate.summary}
                            </p>
                          </li>
                        ))}
                      </ul>
                    )}
                  </section>
                </aside>
              </div>
            </div>
          );
        }}
      </AsyncPage>
    </section>
  );
}
