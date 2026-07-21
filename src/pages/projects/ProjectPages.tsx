import {
  ArrowRight,
  CheckCircle,
  FolderOpen,
  Target,
} from '@phosphor-icons/react';
import { Link } from 'react-router-dom';

import projectCatalog from '../../../content/projects/mvp/catalog.json';
import { usePracticeEvidence } from '../../application/practice';
import { mvpLeafSkills } from '../../content/mvp-capability-content';
import { useI18n } from '../../i18n';
import { PageHeader } from '../shared';

const skillNames = new Map(mvpLeafSkills.map(({ id, name }) => [id, name]));

export function ProjectListPage() {
  const { t } = useI18n();
  return (
    <section className="product-page beta-library" aria-labelledby="page-title">
      <PageHeader
        eyebrow={t('project.eyebrow')}
        title={t('project.title')}
        description={t('project.description')}
      />
      <div className="beta-card-grid">
        {projectCatalog.projects.map((project) => (
          <article className="growth-card beta-content-card" key={project.id}>
            <FolderOpen aria-hidden="true" size={24} />
            <h2>{project.title}</h2>
            <p>{project.summary}</p>
            <p>
              {t('project.requiredCount', {
                count: project.requiredLeafSkillIds.length,
              })}
            </p>
            <Link to={`/projects/${project.id}`}>
              {t('project.open')}
              <ArrowRight aria-hidden="true" size={16} />
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ProjectDetailPage({ projectId }: { projectId: string }) {
  const { t } = useI18n();
  const { evidence, projectEvidence, toggleProjectMilestone } =
    usePracticeEvidence();
  const project = projectCatalog.projects.find(({ id }) => id === projectId);
  if (project === undefined)
    return (
      <section className="product-page">
        <PageHeader
          eyebrow={t('project.eyebrow')}
          title={t('project.notFound')}
          description={t('project.notFoundDescription')}
        />
      </section>
    );
  const evidencedSkills = new Set(
    evidence.map(({ leafSkillId }) => leafSkillId),
  );
  const evidencedSkillCount = project.requiredLeafSkillIds.filter((id) =>
    evidencedSkills.has(id),
  ).length;
  const milestones = ['architecture', 'evaluation', 'deployment'] as const;
  const record = projectEvidence.find((item) => item.projectId === project.id);
  const completedMilestones = new Set(record?.completedMilestones ?? []);
  return (
    <section className="product-page beta-detail" aria-labelledby="page-title">
      <PageHeader
        eyebrow={t('project.eyebrow')}
        title={project.title}
        description={project.summary}
      />
      <div className="beta-detail-grid">
        <article className="growth-card beta-action-card">
          <div className="growth-card__heading">
            <div>
              <h2>{t('project.progress')}</h2>
              <p>
                {t('project.progressCount', {
                  completed: completedMilestones.size,
                  total: milestones.length,
                })}
              </p>
            </div>
            <Target aria-hidden="true" size={22} />
          </div>
          <ol className="beta-milestones">
            {milestones.map((milestone) => (
              <li
                key={milestone}
                data-complete={completedMilestones.has(milestone) || undefined}
              >
                {completedMilestones.has(milestone) ? (
                  <CheckCircle aria-hidden="true" size={20} />
                ) : (
                  <span aria-hidden="true">○</span>
                )}
                <strong>{t(`project.milestone.${milestone}`)}</strong>
                <button
                  className="button button--secondary"
                  type="button"
                  aria-pressed={completedMilestones.has(milestone)}
                  onClick={() => toggleProjectMilestone(project.id, milestone)}
                >
                  {t(
                    completedMilestones.has(milestone)
                      ? 'project.markIncomplete'
                      : 'project.markComplete',
                  )}
                </button>
              </li>
            ))}
          </ol>
          <h3>{t('project.deliverables')}</h3>
          <ul>
            {project.deliverables.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </article>
        <aside className="growth-card beta-context-card">
          <h2>{t('project.requiredSkills')}</h2>
          <ul>
            {project.requiredLeafSkillIds.map((id) => (
              <li key={id}>
                {skillNames.get(id) ?? id}
                {evidencedSkills.has(id) ? ` · ${t('project.evidenced')}` : ''}
              </li>
            ))}
          </ul>
          <p>{t('project.localBoundary', { count: evidencedSkillCount })}</p>
          <Link to="/practices">
            {t('project.buildEvidence')}
            <ArrowRight aria-hidden="true" size={16} />
          </Link>
        </aside>
      </div>
    </section>
  );
}
