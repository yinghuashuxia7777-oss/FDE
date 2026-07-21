import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import { I18nProvider } from '../../i18n';
import { CapabilityProfileView } from './CapabilityProfileView';

it('explains a capability level with real Practice evidence', () => {
  render(
    <I18nProvider initialLanguage="en-US">
      <MemoryRouter>
        <CapabilityProfileView
          challenges={[]}
          evidence={[]}
          mvpLeafEvidence={[
            {
              skillId: 'rag.retrieval',
              label: 'RAG Retrieval',
              parentSkillId: undefined,
              score: 88,
              primaryEvidenceCount: 1,
              supportingEvidenceCount: 0,
              sourceAttemptIds: ['practice-evidence:rag'],
            },
          ]}
          practiceEvidence={[
            {
              id: 'practice-evidence:rag',
              practiceId: 'practice.rag.retrieval',
              leafSkillId: 'rag.retrieval',
              completedAt: '2026-07-21T00:00:00.000Z',
              evaluationResult: { outcome: 'passed', score: 88 },
              evidenceOutput: {
                artifactType: 'decision-record',
                response: 'Use retrieval evidence and verify recall.',
              },
              provenance: 'local-practice',
            },
          ]}
          projectEvidence={[]}
          readiness={undefined}
          skills={[]}
        />
      </MemoryRouter>
    </I18nProvider>,
  );

  expect(screen.getByText('Why this capability level?')).toBeVisible();
  expect(screen.getByText(/Passed Practice:.*retrieval/i)).toBeVisible();
});
