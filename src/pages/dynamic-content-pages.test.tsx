import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

import type { ContentManagement } from '../application/product';
import type { DomainDefinition, SkillDefinition } from '../content/contracts';
import { SkillsPage } from './skills';

const addedDomain: DomainDefinition = {
  schemaVersion: 1,
  id: 'new-content-domain',
  label: 'New content-defined domain',
  description: 'A domain added by a content pack.',
  status: 'active',
};

const addedSkill: SkillDefinition = {
  schemaVersion: 1,
  id: 'new-content-domain.first-skill',
  domainId: addedDomain.id,
  label: 'First imported skill',
  description: 'A skill added without changing page code.',
  status: 'active',
};

function repositories() {
  const content = {
    getActiveCatalog: vi.fn().mockResolvedValue(undefined),
    getActivePack: vi.fn().mockResolvedValue(undefined),
    getInstalledPack: vi.fn().mockResolvedValue(undefined),
    listInstalledPacks: vi.fn().mockResolvedValue([]),
    countHistoricalCaseVersions: vi.fn().mockResolvedValue(0),
    listActiveDomains: vi.fn().mockResolvedValue([addedDomain]),
    listActiveSkills: vi.fn().mockResolvedValue([addedSkill]),
    findDomainDefinition: vi.fn().mockResolvedValue(addedDomain),
    findSkillDefinition: vi.fn().mockResolvedValue(addedSkill),
  };

  return {
    attempts: {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      delete: vi.fn(),
    },
    cases: {
      list: vi.fn().mockResolvedValue([]),
      listActive: vi.fn().mockResolvedValue([
        {
          id: 'new-content-domain-case',
          slug: 'new-content-domain-case',
          title: 'Imported domain case',
          summary: 'A case from the imported pack.',
          level: 'beginner',
          status: 'published',
          version: 1,
          estimatedMinutes: 10,
          domains: [addedDomain.id],
          skills: [addedSkill.id],
          riskTypes: [],
          scenarioSummary: 'A content-defined incident.',
          technicalLayers: ['application'],
          nodeTypes: ['single-choice'],
        },
      ]),
      getVersion: vi.fn(),
      seed: vi.fn(),
    },
    content,
    contentManagement: {} as ContentManagement,
    mistakes: {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      delete: vi.fn(),
    },
    progress: {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      commitCompletion: vi.fn(),
      clear: vi.fn(),
      exportUserData: vi.fn(),
      replaceUserData: vi.fn(),
    },
    settings: { get: vi.fn(), save: vi.fn() },
    skills: {
      get: vi.fn(),
      list: vi.fn().mockResolvedValue([]),
      save: vi.fn(),
      saveMany: vi.fn(),
    },
  };
}

describe('dynamic content pages', () => {
  it('T18 displays a newly installed domain and skill without page changes', async () => {
    const source = repositories();
    const { content } = source;
    render(
      <MemoryRouter>
        <SkillsPage repositories={source} />
      </MemoryRouter>,
    );

    expect(
      await screen.findByRole('heading', { name: addedDomain.label }),
    ).toBeVisible();
    expect(screen.getByText(addedSkill.label)).toBeVisible();
    expect(screen.getAllByText('N/A').length).toBeGreaterThan(0);
    expect(vi.mocked(source.cases.listActive)).toHaveBeenCalledOnce();
    expect(vi.mocked(content.listActiveDomains)).toHaveBeenCalledOnce();
    expect(vi.mocked(content.listActiveSkills)).toHaveBeenCalledOnce();
  });
});
