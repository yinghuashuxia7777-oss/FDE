import { useState, type ChangeEvent } from 'react';

import {
  type ContentManagement,
  type PreparedContentInstallation,
  type ProductRepositories,
  useAsyncPageData,
  useProductRepositories,
} from '../../application/product';
import {
  LOCAL_USER_ID,
  type LocalDataBundle,
} from '../../repositories/contracts';
import type { CaseLevel } from '../../domain/cases/types';
import {
  LocalDataBundleSchema,
  MAX_IMPORT_FILE_BYTES,
} from '../../schemas/export.schema';
import { localizeUiError, useI18n } from '../../i18n';
import { AsyncPage, PageHeader } from '../shared';

interface SettingsPageProps {
  repositories?: ProductRepositories;
  contentManagement?: ContentManagement;
}

type RepositoriesWithContentManagement = ProductRepositories & {
  contentManagement?: ContentManagement;
};

type OperationState =
  | { tone: 'success' | 'error'; kind: 'translation'; key: string }
  | { tone: 'error'; kind: 'runtime'; error: unknown };

const COVERAGE_LEVELS: readonly CaseLevel[] = [
  'beginner',
  'intermediate',
  'advanced',
  'expert',
];

const COVERAGE_LEVEL_LABEL_KEYS: Record<CaseLevel, string> = {
  beginner: 'settings.level.beginner',
  intermediate: 'settings.level.intermediate',
  advanced: 'settings.level.advanced',
  expert: 'settings.level.expert',
};

const SOURCE_LABEL_KEYS = {
  bundled: 'settings.source.bundled',
  file: 'settings.source.file',
  url: 'settings.source.url',
  database: 'settings.source.database',
} as const;

function requireContentManagement(
  repositories: ProductRepositories,
  override: ContentManagement | undefined,
  unavailableMessage: string,
): ContentManagement {
  const service =
    override ??
    (repositories as RepositoriesWithContentManagement).contentManagement;
  if (service === undefined) {
    throw new Error(unavailableMessage);
  }
  return service;
}

function downloadJson(fileName: string, value: unknown): void {
  const blob = new Blob([`${JSON.stringify(value, null, 2)}\n`], {
    type: 'application/json',
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function SettingsPage({
  repositories: override,
  contentManagement: contentManagementOverride,
}: SettingsPageProps) {
  const { language, setLanguage, t } = useI18n();
  const getRepositories = useProductRepositories(override);
  const [prepared, setPrepared] = useState<PreparedContentInstallation>();
  const [pendingProgress, setPendingProgress] = useState<LocalDataBundle>();
  const [operation, setOperation] = useState<OperationState>();
  const [busy, setBusy] = useState(false);
  const { state, retry } = useAsyncPageData(async () => {
    const repositories = await getRepositories();
    const contentManagement = requireContentManagement(
      repositories,
      contentManagementOverride,
      t('settings.errors.contentManagementUnavailable'),
    );
    const [status, activeCases] = await Promise.all([
      contentManagement.getStatus(),
      repositories.cases.listActive(),
    ]);
    return {
      repositories,
      contentManagement,
      status,
      activeCases,
    };
  }, [getRepositories, contentManagementOverride, t]);

  const selectContentPack = async (
    event: ChangeEvent<HTMLInputElement>,
    contentManagement: ContentManagement,
  ) => {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    setBusy(true);
    setOperation(undefined);
    setPrepared(undefined);
    try {
      setPrepared(await contentManagement.prepareFile(file));
    } catch (error) {
      setOperation({ tone: 'error', kind: 'runtime', error });
    } finally {
      setBusy(false);
    }
  };

  const selectProgressBackup = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file === undefined) return;
    setOperation(undefined);
    setPendingProgress(undefined);
    try {
      if (file.size > MAX_IMPORT_FILE_BYTES) {
        setOperation({
          tone: 'error',
          kind: 'translation',
          key: 'settings.errors.progressBackupTooLarge',
        });
        return;
      }
      setPendingProgress(
        LocalDataBundleSchema.parse(JSON.parse(await file.text())),
      );
    } catch (error) {
      setOperation({ tone: 'error', kind: 'runtime', error });
    }
  };

  return (
    <section className="product-page" aria-labelledby="page-title">
      <PageHeader
        eyebrow={t('settings.header.eyebrow')}
        title={t('settings.header.title')}
        description={t('settings.header.description')}
      />
      <AsyncPage state={state} retry={retry}>
        {({ repositories, contentManagement, status, activeCases }) => {
          const manifest = status.pack?.manifest;
          const activeCaseCount = activeCases.length;
          const targetCaseCount = status.pack?.coverage.targetCaseCount ?? 0;
          const remainingCaseCount = Math.max(
            targetCaseCount - activeCaseCount,
            0,
          );
          const coveragePercentage =
            targetCaseCount === 0
              ? 0
              : Math.min(
                  Math.round((activeCaseCount / targetCaseCount) * 100),
                  100,
                );
          const levelCounts = new Map(
            COVERAGE_LEVELS.map((level) => [
              level,
              activeCases.filter((activeCase) => activeCase.level === level)
                .length,
            ]),
          );
          const visibleLevels = COVERAGE_LEVELS.filter(
            (level) => level !== 'expert' || (levelCounts.get(level) ?? 0) > 0,
          );
          const activeDomains =
            status.pack?.domains.filter(({ status }) => status === 'active') ??
            [];
          const domainTargets = new Map(
            status.pack?.coverage.domains.map(
              ({ domainId, targetCaseCount }) => [domainId, targetCaseCount],
            ) ?? [],
          );
          const sourceKind = status.catalog?.sourceKind;
          const sourceLabel = t(
            sourceKind === undefined
              ? 'settings.source.unknown'
              : SOURCE_LABEL_KEYS[sourceKind],
          );
          return (
            <div className="product-stack settings-stack">
              {operation === undefined ? null : (
                <p
                  className={`operation-message operation-message--${operation.tone}`}
                  role={operation.tone === 'error' ? 'alert' : 'status'}
                >
                  {operation.kind === 'translation'
                    ? t(operation.key)
                    : localizeUiError(
                        language,
                        operation.error,
                        t('settings.errors.operationFailed'),
                      )}
                </p>
              )}

              <section
                className="settings-panel"
                aria-labelledby="language-settings-title"
              >
                <div>
                  <p className="eyebrow">{t('settings.language.eyebrow')}</p>
                  <h2 id="language-settings-title">
                    {t('settings.language.title')}
                  </h2>
                </div>
                <p>{t('settings.language.description')}</p>
                <fieldset className="settings-language-options">
                  <legend>{t('language.switcherLabel')}</legend>
                  <label>
                    <input
                      checked={language === 'zh-CN'}
                      name="interface-language"
                      type="radio"
                      value="zh-CN"
                      onChange={() => setLanguage('zh-CN')}
                    />
                    <span>{t('language.zhCN')}</span>
                  </label>
                  <label>
                    <input
                      checked={language === 'en-US'}
                      name="interface-language"
                      type="radio"
                      value="en-US"
                      onChange={() => setLanguage('en-US')}
                    />
                    <span lang={language === 'zh-CN' ? 'en-US' : undefined}>
                      {t('language.enUS')}
                    </span>
                  </label>
                </fieldset>
              </section>

              <section
                className="settings-panel"
                aria-labelledby="content-info-title"
              >
                <div>
                  <p className="eyebrow">{t('settings.catalog.eyebrow')}</p>
                  <h2 id="content-info-title">{t('settings.catalog.title')}</h2>
                </div>
                {manifest === undefined ? (
                  <p>{t('settings.catalog.none')}</p>
                ) : (
                  <>
                    <dl className="settings-facts">
                      <div>
                        <dt>{t('settings.fact.name')}</dt>
                        <dd>{manifest.displayName}</dd>
                      </div>
                      <div>
                        <dt>{t('settings.fact.packId')}</dt>
                        <dd>{manifest.packId}</dd>
                      </div>
                      <div>
                        <dt>{t('settings.fact.contentVersion')}</dt>
                        <dd>{manifest.contentVersion}</dd>
                      </div>
                      <div>
                        <dt>{t('settings.fact.schemaVersion')}</dt>
                        <dd>{manifest.schemaVersion}</dd>
                      </div>
                      <div>
                        <dt>{t('settings.fact.activeCases')}</dt>
                        <dd>{activeCaseCount}</dd>
                      </div>
                      <div>
                        <dt>{t('settings.fact.packCaseVersions')}</dt>
                        <dd>{manifest.caseVersionCount}</dd>
                      </div>
                      <div>
                        <dt>{t('settings.fact.historicalCaseVersions')}</dt>
                        <dd>{status.historicalCaseVersionCount}</dd>
                      </div>
                      <div>
                        <dt>{t('settings.fact.released')}</dt>
                        <dd>
                          <time dateTime={manifest.releasedAt}>
                            {manifest.releasedAt}
                          </time>
                        </dd>
                      </div>
                      <div>
                        <dt>{t('settings.fact.source')}</dt>
                        <dd>{sourceLabel}</dd>
                      </div>
                      <div>
                        <dt>{t('settings.fact.checksum')}</dt>
                        <dd>
                          {status.checksumMatchesCatalog
                            ? t('settings.checksum.verified')
                            : t('settings.checksum.mismatch')}
                        </dd>
                      </div>
                    </dl>
                    <section
                      className="content-coverage"
                      aria-labelledby="content-coverage-title"
                    >
                      <div>
                        <p className="eyebrow">
                          {t('settings.coverage.eyebrow')}
                        </p>
                        <h3 id="content-coverage-title">
                          {t('settings.coverage.title')}
                        </h3>
                      </div>
                      <dl
                        className="settings-facts coverage-levels"
                        aria-label={t('settings.coverage.byLevel')}
                      >
                        <div>
                          <dt>{t('settings.fact.activeCases')}</dt>
                          <dd>{activeCaseCount}</dd>
                        </div>
                        {visibleLevels.map((level) => (
                          <div key={level}>
                            <dt>{t(COVERAGE_LEVEL_LABEL_KEYS[level])}</dt>
                            <dd>{levelCounts.get(level) ?? 0}</dd>
                          </div>
                        ))}
                      </dl>
                      <div className="coverage-plan">
                        <div className="coverage-plan__summary">
                          <div>
                            <p className="eyebrow">
                              {t('settings.coverage.overallPlan')}
                            </p>
                            <strong>
                              {activeCaseCount} / {targetCaseCount}
                            </strong>
                          </div>
                          <div className="coverage-plan__remaining">
                            <strong>{coveragePercentage}%</strong>
                            <span>
                              {t('settings.coverage.remainingCount', {
                                count: remainingCaseCount,
                              })}
                            </span>
                          </div>
                        </div>
                        <progress
                          aria-label={t('settings.coverage.overallLabel')}
                          max={Math.max(targetCaseCount, 1)}
                          value={Math.min(
                            activeCaseCount,
                            Math.max(targetCaseCount, 1),
                          )}
                        />
                      </div>
                      <div className="coverage-table-scroll">
                        <table>
                          <caption>{t('settings.coverage.byDomain')}</caption>
                          <thead>
                            <tr>
                              <th scope="col">
                                {t('settings.coverage.domain')}
                              </th>
                              <th scope="col">
                                {t('settings.coverage.current')}
                              </th>
                              <th scope="col">
                                {t('settings.coverage.target')}
                              </th>
                              <th scope="col">
                                {t('settings.coverage.remaining')}
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {activeDomains.map(({ id, label }) => {
                              const current = activeCases.filter((activeCase) =>
                                activeCase.domains.includes(id),
                              ).length;
                              const target = domainTargets.get(id) ?? 0;
                              return (
                                <tr key={id}>
                                  <th scope="row">{label}</th>
                                  <td>{current}</td>
                                  <td>{target}</td>
                                  <td>{Math.max(target - current, 0)}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </section>
                    <details>
                      <summary>{t('settings.fact.checksum')}</summary>
                      <code>{manifest.checksum}</code>
                    </details>
                  </>
                )}
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => {
                    void contentManagement.exportStatus().then(
                      (exported) =>
                        downloadJson('fde-arena-content-status.json', exported),
                      (error: unknown) =>
                        setOperation({
                          tone: 'error',
                          kind: 'runtime',
                          error,
                        }),
                    );
                  }}
                >
                  {t('settings.catalog.exportStatus')}
                </button>
              </section>

              <section
                className="settings-panel"
                aria-labelledby="content-import-title"
              >
                <div>
                  <p className="eyebrow">{t('settings.contentPack.eyebrow')}</p>
                  <h2 id="content-import-title">
                    {t('settings.contentPack.importTitle')}
                  </h2>
                </div>
                <p>{t('settings.contentPack.description')}</p>
                <label>
                  {t('settings.contentPack.select')}
                  <input
                    accept="application/json,.json"
                    disabled={busy}
                    type="file"
                    onChange={(event) => {
                      void selectContentPack(event, contentManagement);
                    }}
                  />
                </label>
                {prepared === undefined ? null : (
                  <article
                    className="content-preview"
                    aria-label={t('settings.contentPack.preview')}
                  >
                    <h3>{prepared.preview.displayName}</h3>
                    <dl className="compact-facts">
                      <div>
                        <dt>{t('settings.contentPack.version')}</dt>
                        <dd>{prepared.preview.contentVersion}</dd>
                      </div>
                      <div>
                        <dt>{t('settings.contentPack.activeCases')}</dt>
                        <dd>{prepared.preview.activeCaseCount}</dd>
                      </div>
                      <div>
                        <dt>{t('settings.contentPack.newVersions')}</dt>
                        <dd>{prepared.preview.newCaseVersionCount}</dd>
                      </div>
                      <div>
                        <dt>{t('settings.contentPack.domains')}</dt>
                        <dd>{prepared.preview.domainCount}</dd>
                      </div>
                    </dl>
                    <button
                      className="button button--primary"
                      disabled={busy}
                      type="button"
                      onClick={() => {
                        setBusy(true);
                        void contentManagement
                          .install(prepared)
                          .then(
                            () => {
                              setPrepared(undefined);
                              setOperation({
                                tone: 'success',
                                kind: 'translation',
                                key: 'settings.operation.packInstalled',
                              });
                              retry();
                            },
                            (error: unknown) =>
                              setOperation({
                                tone: 'error',
                                kind: 'runtime',
                                error,
                              }),
                          )
                          .finally(() => setBusy(false));
                      }}
                    >
                      {t('settings.contentPack.install')}
                    </button>
                  </article>
                )}
                <button
                  className="button button--secondary"
                  disabled={busy}
                  type="button"
                  onClick={() => {
                    setBusy(true);
                    void contentManagement
                      .restoreBundled()
                      .then(
                        () => {
                          setPrepared(undefined);
                          setOperation({
                            tone: 'success',
                            kind: 'translation',
                            key: 'settings.operation.bundledRestored',
                          });
                          retry();
                        },
                        (error: unknown) =>
                          setOperation({
                            tone: 'error',
                            kind: 'runtime',
                            error,
                          }),
                      )
                      .finally(() => setBusy(false));
                  }}
                >
                  {t('settings.contentPack.restore')}
                </button>
              </section>

              <section
                className="settings-panel"
                aria-labelledby="progress-title"
              >
                <div>
                  <p className="eyebrow">{t('settings.progress.eyebrow')}</p>
                  <h2 id="progress-title">{t('settings.progress.title')}</h2>
                </div>
                <p>{t('settings.progress.description')}</p>
                <button
                  className="button button--secondary"
                  type="button"
                  onClick={() => {
                    void repositories.progress
                      .exportUserData(LOCAL_USER_ID)
                      .then(
                        (bundle) =>
                          downloadJson('fde-arena-user-progress.json', bundle),
                        (error: unknown) =>
                          setOperation({
                            tone: 'error',
                            kind: 'runtime',
                            error,
                          }),
                      );
                  }}
                >
                  {t('settings.progress.export')}
                </button>
                <label>
                  {t('settings.progress.select')}
                  <input
                    accept="application/json,.json"
                    type="file"
                    onChange={(event) => {
                      void selectProgressBackup(event);
                    }}
                  />
                </label>
                {pendingProgress === undefined ? null : (
                  <button
                    className="button button--primary"
                    type="button"
                    onClick={() => {
                      void repositories.progress
                        .replaceUserData(pendingProgress)
                        .then(
                          () => {
                            setPendingProgress(undefined);
                            setOperation({
                              tone: 'success',
                              kind: 'translation',
                              key: 'settings.operation.progressImported',
                            });
                          },
                          (error: unknown) =>
                            setOperation({
                              tone: 'error',
                              kind: 'runtime',
                              error,
                            }),
                        );
                    }}
                  >
                    {t('settings.progress.import')}
                  </button>
                )}
              </section>
            </div>
          );
        }}
      </AsyncPage>
    </section>
  );
}
