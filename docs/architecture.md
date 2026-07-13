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
  listActive(query?: CaseQuery): Promise<CaseSummary[]>;
  list(query?: CaseQuery): Promise<CaseSummary[]>;
  getVersion(caseId: string, version?: number): Promise<FdeCase | undefined>;
  seed(cases: FdeCase[]): Promise<void>;
}
```

`listActive` is governed only by the explicit `ActiveContentCatalog`; it never
infers a current version. `getVersion(caseId, version)` is the historical read
path used by debriefs, mistakes, and profile calculations. Omitting a version
returns no result rather than selecting the highest stored version.

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

Database name: `fde-arena`; current schema version: 2. The v1-to-v2 migration
only adds content-pack storage and preserves every pre-existing record.

Object stores:

- `caseVersions`: `[caseId, version]`
- `attempts`: attempt ID, with case and completion indexes
- `progress`: `[userId, caseId]`
- `mastery`: `[userId, skillId]`
- `mistakes`: mistake ID, with skill/error/critical indexes
- `settings`: user ID
- `coverage`: case ID
- `appMeta`: key
- `contentPacks`: `[packId, contentVersion]`, including the immutable Manifest,
  Domain, Skill, and Coverage snapshot

Content installation writes `caseVersions`, `contentPacks`, and the active
catalog in one transaction. It never opens `attempts`, `progress`, `mastery`,
`mistakes`, or `settings` for writing. Migrations never delete data silently.
The same case ID and version is idempotent only when its SHA-256 content hash is
unchanged; a conflicting immutable version rejects the whole pack.

## Import/export

The export envelope is JSON with `formatVersion: 1`, semantic `appVersion`, ISO `exportedAt`, and the user-owned payload. Import accepts local files only, limits size before parsing, validates every record, previews counts, and replaces progress data transactionally after confirmation. Case content is not trusted from user imports.

## Content packs and update workflow

The checked-in content tree is the only source of formal questions and
definitions. `content/manifests/content-config.json` supplies deterministic
release metadata; committed generated artifacts never use the current clock.
At build time, `content:index` scans `content/cases`, `content/domains`, and
`content/skills`, validates the coverage plan, and generates the Manifest,
coverage report, JSON Schemas, and lazy loader map. Application pages never
maintain imports for individual cases.

The normal content-only release is:

1. Add a versioned case JSON under the matching level directory. Keep every
   published Case, Node, Option, Evidence, Domain, and Skill ID stable.
2. Add or update Domain and Skill definitions and
   `content/coverage/coverage-plan.json`. A meaning change gets a new ID.
3. Select exact active case versions in
   `content/manifests/content-config.json`; update content version and fixed
   release timestamp. Never mutate a released `(caseId, version)`.
4. Run `npm run content:validate`, `npm run coverage:audit`, and
   `npm run content:index`.
5. Run `npm run content:check` and the test/build gates, then publish the
   generated artifacts or export the complete JSON Content Pack.

Adding a Domain follows the same flow and does not change a page. Adding a new
question type is the only content change that also extends the engine and UI.
A future case schema change adds a sequential migration in
`src/content/migrations`; it does not rewrite historical JSON in bulk. Future
URL or database sources implement `ContentSource` and retain the same installer,
repositories, and pages.

At runtime, `LocalContentSource` and `JsonFileContentSource` each load one
complete immutable `ContentPack` snapshot. `ContentInstaller` validates schema,
migrations, hashes, IDs, references, graph safety, coverage, limits, and
conflicts before starting its single IndexedDB transaction. Restoring bundled
content changes only the active catalog; imported versions and user history are
retained.

## Content quality pipeline

`content:validate` checks Zod/JSON Schema, schema and content versions, stable and
unique IDs, answers, option explanations, metadata, reviewers, references, and
active/deprecated rules. Graph validation detects missing or unreachable nodes,
dead cycles, and missing terminal paths. `coverage:audit` compares the authored
362-case plan against actual active content. `content:index` runs only after
validation, and `content:check` regenerates in memory and fails on byte drift.

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
