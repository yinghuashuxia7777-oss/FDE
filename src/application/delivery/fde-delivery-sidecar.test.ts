import { BETA_STORAGE_KEYS } from '../practice/beta-sidecar';
import academyCatalog from '../../../content/academy/zh-CN/catalog.json';
import projectCatalog from '../../../content/projects/mvp/catalog.json';
import {
  FDE_DELIVERY_STORAGE_KEY,
  fdeDeliveryStore,
} from './fde-delivery-sidecar';
import {
  StaticFdeDeliverySource,
  bundledFdeDeliverySource,
} from '../../content/fde-delivery-source';
import { mvpPractices } from '../../content/mvp-practice-source';
import type {
  DeliveryStageId,
  FdeDeliveryRecord,
} from '../../domain/delivery/types';

const STAGE_IDS: readonly DeliveryStageId[] = [
  'discover',
  'define-value',
  'design',
  'activate',
  'review-reuse',
];

const recordWithProblemBrief: FdeDeliveryRecord = {
  templateId: 'project.ai-customer-solution',
  artifacts: { discover: 'A reviewable problem brief.' },
  completedStageIds: ['discover'],
  updatedAt: '2026-07-30T08:00:00.000Z',
};

describe('FDE delivery local sidecar', () => {
  beforeEach(() => localStorage.clear());
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('round-trips artifacts without touching attempts, beta sidecars, or IndexedDB', () => {
    const attemptKey = 'fde-arena:attempts';
    localStorage.setItem(attemptKey, 'attempt-sentinel');
    Object.values(BETA_STORAGE_KEYS).forEach((key) =>
      localStorage.setItem(key, 'beta-sentinel'),
    );
    const indexedDbOpen = vi.fn();
    vi.stubGlobal('indexedDB', { open: indexedDbOpen });

    fdeDeliveryStore.save(recordWithProblemBrief);

    expect(
      fdeDeliveryStore.load('project.ai-customer-solution').artifacts.discover,
    ).toBe('A reviewable problem brief.');
    expect(localStorage.getItem(attemptKey)).toBe('attempt-sentinel');
    Object.values(BETA_STORAGE_KEYS).forEach((key) =>
      expect(localStorage.getItem(key)).toBe('beta-sentinel'),
    );
    expect(indexedDbOpen).not.toHaveBeenCalled();

    const stored: unknown = JSON.parse(
      localStorage.getItem(FDE_DELIVERY_STORAGE_KEY) ?? 'null',
    );
    expect(stored).toEqual([recordWithProblemBrief]);
    expect(
      Object.keys((stored as FdeDeliveryRecord[])[0] ?? {}).sort(),
    ).toEqual(['artifacts', 'completedStageIds', 'templateId', 'updatedAt']);
  });

  it('falls back to an empty record for malformed or schema-drifted local data', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-07-30T09:30:00.000Z'));

    localStorage.setItem(FDE_DELIVERY_STORAGE_KEY, '{bad json');
    expect(fdeDeliveryStore.load('project.enterprise-rag-assistant')).toEqual({
      templateId: 'project.enterprise-rag-assistant',
      artifacts: {},
      completedStageIds: [],
      updatedAt: '2026-07-30T09:30:00.000Z',
    });

    localStorage.setItem(
      FDE_DELIVERY_STORAGE_KEY,
      JSON.stringify([{ ...recordWithProblemBrief, attemptId: 'forbidden' }]),
    );
    expect(
      fdeDeliveryStore.load('project.ai-customer-solution').completedStageIds,
    ).toEqual([]);
  });

  it('resets only the requested template record', () => {
    fdeDeliveryStore.save(recordWithProblemBrief);
    fdeDeliveryStore.save({
      ...recordWithProblemBrief,
      templateId: 'project.enterprise-rag-assistant',
      artifacts: { design: 'A permission-aware architecture.' },
      completedStageIds: ['design'],
    });

    fdeDeliveryStore.reset('project.ai-customer-solution');

    expect(
      fdeDeliveryStore.load('project.ai-customer-solution').artifacts,
    ).toEqual({});
    expect(
      fdeDeliveryStore.load('project.enterprise-rag-assistant').artifacts
        .design,
    ).toBe('A permission-aware architecture.');
  });
});

describe('FDE delivery definitions', () => {
  it('loads three project-matched templates with the five ordered stages and valid links', () => {
    const templates = bundledFdeDeliverySource.loadAll();
    const validHrefs = new Set([
      ...mvpPractices.map(({ id }) => `/practices/${id}`),
      ...academyCatalog.stages
        .flatMap(({ topicIds }) => topicIds)
        .map((id) => `/academy/${id}`),
      ...projectCatalog.projects.map(({ id }) => `/projects/${id}`),
    ]);

    expect(templates.map(({ id }) => id)).toEqual([
      'project.enterprise-rag-assistant',
      'project.agent-workflow-system',
      'project.ai-customer-solution',
    ]);

    templates.forEach((template) => {
      expect(template.stages.map(({ id }) => id)).toEqual(STAGE_IDS);
      expect(template.attributionUrl).toMatch(/^https:\/\//);
      template.stages.forEach((stage) => {
        expect(stage.artifactLabel.trim()).not.toBe('');
        expect(stage.prompt.trim()).not.toBe('');
        expect(stage.whatThisProves.trim()).not.toBe('');
        expect(stage.relatedLinks.length).toBeGreaterThan(0);
        stage.relatedLinks.forEach(({ kind, href }) => {
          const prefixes = {
            practice: '/practices/practice.',
            academy: '/academy/academy.',
            project: '/projects/project.',
          } as const;
          expect(href.startsWith(prefixes[kind])).toBe(true);
          expect(validHrefs.has(href)).toBe(true);
        });
      });
    });
  });

  it('strictly rejects unknown content fields before exposing definitions', () => {
    const template = (suffix: string) => ({
      id: `project.test-${suffix}`,
      title: 'Test delivery',
      summary: 'A test delivery template.',
      attributionUrl: 'https://example.com/fde',
      stages: STAGE_IDS.map((id) => ({
        id,
        title: id,
        artifactLabel: 'Artifact',
        prompt: 'Create an original reviewable artifact.',
        whatThisProves: 'Shows a reviewable delivery decision.',
        relatedLinks: [
          {
            kind: 'project' as const,
            label: 'Project',
            href: `/projects/project.test-${suffix}`,
          },
        ],
      })),
    });
    const validCatalog = {
      schemaVersion: 1,
      templates: [template('one'), template('two'), template('three')],
    };

    expect(() => new StaticFdeDeliverySource(validCatalog)).not.toThrow();
    expect(
      () =>
        new StaticFdeDeliverySource({
          ...validCatalog,
          templates: validCatalog.templates.map((candidate, index) =>
            index === 0 ? { ...candidate, unexpected: true } : candidate,
          ),
        }),
    ).toThrow();
  });

  it('returns one deeply frozen snapshot and finds templates by stable ID', () => {
    const first = bundledFdeDeliverySource.loadAll();
    const second = bundledFdeDeliverySource.loadAll();

    expect(second).toBe(first);
    expect(Object.isFrozen(first)).toBe(true);
    expect(Object.isFrozen(first[0])).toBe(true);
    expect(Object.isFrozen(first[0]?.stages)).toBe(true);
    expect(Object.isFrozen(first[0]?.stages[0]?.relatedLinks)).toBe(true);
    expect(
      bundledFdeDeliverySource.findById('project.enterprise-rag-assistant'),
    ).toBe(first[0]);
    expect(
      bundledFdeDeliverySource.findById('project.missing'),
    ).toBeUndefined();
  });
});
