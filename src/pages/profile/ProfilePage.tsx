import {
  buildCapabilityEvidenceRecords,
  buildCompletedChallengeProfiles,
  buildSkillEvidenceProfiles,
  calculateEvidenceReadiness,
  projectMvpLeafEvidence,
  projectSessionPracticeEvidence,
  mergeMvpLeafEvidence,
  type ProductRepositories,
  type TrustedAttempt,
  useAsyncPageData,
  useProductRepositories,
} from '../../application/product';
import { Link } from 'react-router-dom';
import { usePracticeEvidence } from '../../application/practice';
import {
  mvpCaseAttributions,
  mvpLeafSkills,
} from '../../content/mvp-capability-content';
import { Alert } from '../../components/ui';
import type { FdeCase } from '../../domain/cases/types';
import { useI18n } from '../../i18n';
import { LOCAL_USER_ID } from '../../repositories/contracts';
import { AsyncPage, PageHeader } from '../shared';
import { CapabilityProfileView } from './CapabilityProfileView';

interface ProfilePageProps {
  repositories?: ProductRepositories;
}

export function ProfilePage({ repositories: override }: ProfilePageProps) {
  const { t } = useI18n();
  const { evidence: practiceEvidence, projectEvidence } = usePracticeEvidence();
  const getRepositories = useProductRepositories(override);
  const { state, retry } = useAsyncPageData(async () => {
    const source = await getRepositories();
    const [attempts, mistakes, mastery, activeSkillDefinitions] =
      await Promise.all([
        source.attempts.list({
          userId: LOCAL_USER_ID,
          status: 'completed',
        }),
        source.mistakes.list({ userId: LOCAL_USER_ID }),
        source.skills.list(LOCAL_USER_ID),
        source.content.listActiveSkills(),
      ]);
    const completed = attempts.filter(
      (attempt): attempt is Extract<typeof attempt, { status: 'completed' }> =>
        attempt.status === 'completed',
    );
    const trusted: TrustedAttempt[] = [];
    const missing: string[] = [];
    const contentByVersion = new Map<string, FdeCase | undefined>();
    const uniqueVersions = [
      ...new Map(
        completed.map((attempt) => [
          `${attempt.caseId}@${String(attempt.caseVersion)}`,
          attempt,
        ]),
      ).values(),
    ];
    await Promise.all(
      uniqueVersions.map(async (attempt) => {
        contentByVersion.set(
          `${attempt.caseId}@${String(attempt.caseVersion)}`,
          await source.cases.getVersion(attempt.caseId, attempt.caseVersion),
        );
      }),
    );
    completed.forEach((attempt) => {
      const key = `${attempt.caseId}@${String(attempt.caseVersion)}`;
      const content = contentByVersion.get(key);
      if (content === undefined) {
        missing.push(key);
      } else {
        trusted.push({ attempt, caseContent: content });
      }
    });
    missing.sort();

    const activeSkillIds = activeSkillDefinitions.map(({ id }) => id);
    const skillDefinitionsById = new Map(
      activeSkillDefinitions.map((definition) => [definition.id, definition]),
    );
    const referencedSkillIds = new Set([
      ...mastery.map(({ skillId }) => skillId),
      ...mistakes.flatMap(({ skillIds }) => skillIds),
      ...trusted.flatMap(({ caseContent }) => caseContent.skills),
    ]);
    const historicalSkillDefinitions = await Promise.all(
      [...referencedSkillIds]
        .filter((id) => !skillDefinitionsById.has(id))
        .sort()
        .map((id) => source.content.findSkillDefinition(id)),
    );
    historicalSkillDefinitions.forEach((definition) => {
      if (definition !== undefined) {
        skillDefinitionsById.set(definition.id, definition);
      }
    });

    return {
      activeSkillIds,
      trusted,
      missing,
      mistakes,
      mastery,
      skillDefinitions: [...skillDefinitionsById.values()],
    };
  }, [getRepositories]);

  return (
    <section
      className="product-page capability-profile-page"
      aria-labelledby="page-title"
    >
      <PageHeader
        eyebrow={t('profile.eyebrow')}
        title={t('profile.title')}
        description={t('profile.description')}
      />
      <AsyncPage state={state} retry={retry}>
        {({
          activeSkillIds,
          trusted,
          missing,
          mistakes,
          mastery,
          skillDefinitions,
        }) => {
          const missingVersions = [...new Set(missing)];
          const evidence = buildCapabilityEvidenceRecords(trusted);
          const challenges = buildCompletedChallengeProfiles(trusted);
          const skills = buildSkillEvidenceProfiles(
            skillDefinitions,
            mastery,
            mistakes,
            trusted,
          );
          const readiness = calculateEvidenceReadiness(
            new Set(activeSkillIds),
            mastery,
          );

          return (
            <div className="capability-profile-stack">
              {missing.length === 0 ? null : (
                <Alert
                  title={t('profile.missingVersions.title')}
                  tone="warning"
                >
                  {t(
                    missing.length === 1
                      ? 'profile.missingVersions.messageOne'
                      : 'profile.missingVersions.message',
                    {
                      count: missing.length,
                      versions: missingVersions.join(', '),
                    },
                  )}
                </Alert>
              )}
              <CapabilityProfileView
                challenges={challenges}
                evidence={evidence}
                mvpLeafEvidence={mergeMvpLeafEvidence(
                  projectMvpLeafEvidence(
                    trusted.map(({ attempt }) => attempt),
                    mvpCaseAttributions,
                    mvpLeafSkills,
                  ),
                  projectSessionPracticeEvidence(
                    practiceEvidence,
                    mvpLeafSkills,
                  ),
                )}
                practiceEvidence={practiceEvidence}
                projectEvidence={projectEvidence}
                readiness={readiness}
                skills={skills}
              />
              <aside className="local-feedback-entry">
                <span>{t('feedback.entry.profile')}</span>
                <Link to="/feedback">
                  {t('feedback.entry.action')}
                  <span aria-hidden="true">→</span>
                </Link>
              </aside>
            </div>
          );
        }}
      </AsyncPage>
    </section>
  );
}
