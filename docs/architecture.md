# FDE Arena Architecture

## Runtime baseline

- Node.js 22.23.0 and npm 10.9.8 are the verified local toolchain.
- React, TypeScript strict mode, Vite, React Router, IndexedDB through `idb`, and Zod.
- Vitest, React Testing Library, Playwright, ESLint, and Prettier.
- Exact dependency versions and `package-lock.json` are created by an approved `--save-exact` install.
- No backend, runtime API, remote font, telemetry, or third-party script.

## Repository map

```text
content/                 Versioned cases, skills, domains, coverage and schemas
docs/                    Product, UI, architecture, content and delivery records
scripts/                 Content validation, graph checks, index generation and coverage audit
src/app/                 Router, providers, bootstrap and error boundary
src/application/         Training session orchestration and application services
src/components/          Layout, evidence, question, scoring and UI primitives
src/domain/              Pure models, evaluation, scoring, mastery, recommendation and coverage
src/pages/               Route-level product areas
src/repositories/        Contracts and IndexedDB implementations
src/schemas/             Zod schemas and import/export envelope
src/storage/             Database, migrations and seed transactions
src/generated/           Generated case index; never hand-edited
src/styles/              Tokens, reset, layout and component styles
src/tests/               Test setup and shared fixtures
tests/e2e/               Browser journeys
```

## Core contracts

```ts
type NodeSubmission =
  | { type: "choice"; selectedOptionIds: string[] }
  | { type: "ordering"; orderedOptionIds: string[] }
  | { type: "matching"; pairs: Record<string, string> }
  | { type: "evidence-conclusion"; conclusionId: string; evidenceIds: string[] };

interface EvaluationResult {
  isCorrect: boolean;
  scoreRatio: number;
  errorTypes: ErrorType[];
  criticalErrorIds: string[];
  consequences: ConsequenceDelta[];
  branchKey: string;
}

interface CaseRepository {
  list(query?: CaseQuery): Promise<CaseSummary[]>;
  getVersion(caseId: string, version?: number): Promise<FdeCase | undefined>;
  seed(cases: FdeCase[]): Promise<void>;
}
```

Other repository contracts are `ProgressRepository`, `AttemptRepository`, `SkillRepository`, `SettingsRepository`, `UserRepository`, and `CoverageRepository`. `UserRepository` exposes only the fixed local profile in the MVP.

## Node schema

Shared fields contain ID, title, prompt, evidence, options, feedback, skill weights, consequences, and branches. Type-specific answers are:

- Choice family: one correct option ID.
- Multiple choice: non-empty correct option ID set.
- Ordering: exact option order plus optional priority and hazardous option IDs.
- Matching: exact left-to-right pair map.
- Evidence-conclusion: one conclusion plus one or more supporting evidence IDs.

Presentation variants `log-analysis`, `command-choice`, `diff-review`, `configuration-review`, `architecture-tradeoff`, and `customer-response` retain single-choice evaluation while selecting a specialized evidence renderer.

## Evaluation and scoring

The evaluator is pure and never mutates session state. Exact correctness controls progression; partial similarity informs feedback.

- Round multipliers: first 1.0, second 0.6, third 0.3; a third wrong answer reveals and scores zero.
- Multiple choice similarity: correct selections add, wrong selections subtract, missing correct selections subtract half weight; clamp to 0-1.
- Ordering similarity: first action 35%, pairwise order 45%, required milestone positions 20%.
- Matching similarity: correct pair count divided by total pair count.
- Evidence-conclusion requires both the conclusion and complete evidence set.
- Node score equals round multiplier times node weight when exact; revealed nodes score zero.
- Case score is earned weighted points divided by reachable weighted points, normalized to 0-100.
- Verdicts: 85 excellent, 70 pass, 55 marginal, otherwise fail; critical error overrides all.

## Training state machine

```text
loading -> active -> feedback -> active
                    -> advancing -> active
                    -> advancing -> completed
```

The reducer stores the current node, round number, hint level, revealed evidence, complete round history, accumulated consequences, score, critical errors, and visited path. Wrong answers produce feedback and remain active. Correct or third-round reveal persists the node history before selecting the next branch.

## Storage

Database name: `fde-arena`; initial schema version: 1.

Object stores:

- `caseVersions`: `[caseId, version]`
- `attempts`: attempt ID, with case and completion indexes
- `progress`: `[userId, caseId]`
- `mastery`: `[userId, skillId]`
- `mistakes`: mistake ID, with skill/error/critical indexes
- `settings`: user ID
- `coverage`: case ID
- `appMeta`: key

All multi-store writes use one transaction. Migrations never delete data silently. Seeding is idempotent and only inserts unseen case versions.

## Import/export

The export envelope is JSON with `formatVersion: 1`, semantic `appVersion`, ISO `exportedAt`, and the user-owned payload. Import accepts local files only, limits size before parsing, validates every record, previews counts, and replaces progress data transactionally after confirmation. Case content is not trusted from user imports.

## Content quality pipeline

`validate-content` checks Zod/JSON Schema, unique IDs, answers, explanations, metadata, reviewer, and references. `validate-graph` detects missing nodes, unreachable nodes, cycles without termination, and missing terminal paths. `audit-coverage` checks difficulty, domain, risk, cross-domain ratios, critical-error families, and deprecated-index leakage. `build-case-index` runs only after validation.

Every batch script supports `--dry-run`, `--limit`, `--input`, `--output`, and `--skip-existing` where relevant.

## Security and privacy

- No `dangerouslySetInnerHTML`; evidence is plain escaped text.
- No real credentials or personal data in cases or fixtures.
- Imported JSON is untrusted and validated before a transaction starts.
- IndexedDB is local browser storage, not encrypted storage; settings explain this.
- Static hosting recommendations include a restrictive CSP and immutable hashed assets.

## Performance targets

- Route-level code splitting.
- Initial app JavaScript target below 250 KB gzip excluding case chunks.
- Interaction feedback within 100 ms; no main-thread task over 50 ms during normal answering.
- Initial IndexedDB seed target below 750 ms on a modern laptop for 24 cases.
- Case library operations remain under 100 ms for 338 summaries.
- No layout shift from asynchronously rendered dashboard modules.

