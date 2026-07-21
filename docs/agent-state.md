# Agent State

## 2026-07-18 Beta Productization checkpoint

- Goal: make the MVP Capability Loop directly usable through Practice,
  Project, and public Demo Profile experiences without extending the durable
  data architecture.
- Scope: 40 reviewed MVP Leaves, 40 focused Practices, all 50 active Case IDs
  attributed at exact versions, session-only Practice Evidence, three Project
  experience pages, `/profile/demo`, and five-step Dashboard Journey links.
- Session Practice Evidence is deliberately non-persistent and never writes
  Mastery, Attempt or IndexedDB. Project progress is also a read-only
  projection, not a stored completion system.
- Project root/cwd remains `/Users/charles/Documents/FDE网页题库` on
  `codex/fde-arena-mvp`. Preserve the accepted dirty worktree. No install,
  service/watch process, stage, commit, reset, clean, migration, browser-profile
  access, or project-external write is authorized.
- Design and plan: `docs/superpowers/specs/2026-07-18-beta-productization.md`
  and `docs/superpowers/plans/2026-07-18-beta-productization.md`.

## 2026-07-18 Beta Productization delivery

- Added Practice list/detail pages and a deterministic bilingual rule-based
  text evaluator. Passing submissions emit session-only Practice Evidence and
  immediately feed Dashboard/Profile Leaf projections; they never write user
  repositories or Mastery.
- Expanded the reviewed MVP Catalog to 40 Leaves, draft Rubrics/Practices to
  40, and exact Case attribution to all 50 active IDs with 113 node/Leaf
  entries. Frozen portfolio counts are Software 10, AI Application 15, Agent
  10, Production 10, and FDE 5.
- Added Project list/detail pages for three templates. Milestones, required
  Skills, deliverables and progress are read-only projections; there is no
  Project persistence or completion model.
- Added isolated `/profile/demo` with 72% Readiness, LLM 85, Agent 75, RAG 80,
  Cloud 60, 20 completed Cases, and Enterprise RAG Assistant.
- The existing Dashboard Journey card now links the five-step path while the
  Dashboard grid and Capability Map remain intact. Desktop/workspace/mobile
  navigation exposes Practices and Projects.
- Fresh verification: V2 validation 0 issues; full Vitest 84 files / 850
  tests; TypeScript; ESLint with zero warnings; content/schema drift checks;
  production build. Vite retains the non-blocking large-main-chunk advisory.
- No dependency, server/watch process, browser/profile access, LLM API,
  backend, migration, Evidence Ledger, historical backfill, Git stage/commit/
  reset/clean, or project-external write was performed.

## 2026-07-18 MVP Capability Loop checkpoint

- Strategic goal: prioritize a usable Knowledge -> Practice -> Case -> Evidence
  -> Capability -> Profile loop over the complete 70-Leaf architecture.
- Approved bounded scope: 30 reviewed MVP Leaves, 20 Case mappings, 30 draft
  Practices, three Project definitions, and a read-only Leaf capability
  projection connected to the existing Capability Map/Profile.
- Projection is read-only over completed Attempts and exact authored mappings.
  It does not write or migrate Attempt, Mastery, IndexedDB, Case, Foundation,
  Concept, Legacy Skill, Dashboard layout, or historical user data.
- Current project root/cwd: `/Users/charles/Documents/FDE网页题库`; branch
  `codex/fde-arena-mvp`; 224 pre-existing changed/untracked paths must remain
  intact. No stage, commit, reset, clean, dependency install, server, or watch
  process is authorized.
- Design and plan: `docs/superpowers/specs/2026-07-18-mvp-capability-loop.md`
  and `docs/superpowers/plans/2026-07-18-mvp-capability-loop.md`.
- Pending: TDD content contracts, authored MVP content, projection/UI wiring,
  bounded verification, independent review, and refreshed review state.

## 2026-07-18 MVP Capability Loop delivery

- Delivered a reviewed 30-Leaf `0.2.0` MVP Catalog, 30 draft Rubrics, 30 draft
  Practices, 20 exact Case/version mappings with 47 node/Leaf entries, and
  three definition-only Project templates.
- Practice and Attribution now declare exact skill/rubric release versions, so
  multiple additive Catalog releases remain fail-closed without blocking draft
  MVP authoring. Published downstream content still requires published release
  context.
- Added a pure completed-Attempt projection. Primary mapping receives the
  authored Attempt score; secondary mapping is supporting evidence only. The
  same Attempt/Leaf source is deduplicated and nothing writes Mastery or user
  storage.
- Existing Dashboard layout is unchanged. Its Capability Map can now display
  mapped Leaf evidence through existing seven nodes. Capability Profile adds a
  compact core Leaf evidence section. Demo stays isolated and declares 72%
  readiness, 20 completed Cases, one Project, LLM 85, Agent 75, RAG 80, and
  Cloud 60.
- Fresh validation: V2 validation 0 issues; Schema drift 0; full Vitest 82
  files / 844 tests; TypeScript; ESLint with zero warnings; production build.
  Only the pre-existing Vite main-chunk advisory remains.
- No dependency, service/watch process, browser/profile access, external write,
  database migration, historical backfill, Evidence Ledger, Git stage/commit/
  reset/clean, or protected-scope modification was performed.

## Current project objective

Build the local-first FDE Arena training application defined in `docs/product-spec.md`, including the React application, IndexedDB persistence, 24 validated MVP cases, the 338-case coverage backlog, automated audits, tests, and delivery documentation.

## Accepted decisions

- The supplied final product specification is the approved product design and authorizes autonomous implementation.
- The repository is a greenfield project with no files or prior commits.
- The application remains local-first, account-free, backend-free, and statically deployable.
- UI direction: a professional, restrained, evidence-first engineering workspace with high information density, low decorative motion, light/dark/system themes, and explicit mobile collapse.
- Main UI skill: `ui-ux-pro-max`; `design-taste-frontend` was consulted only for anti-template and accessibility checks because it explicitly excludes dense dashboards.
- The approved production and development dependency sets are installed locally with exact versions; no new dependency may be added without approval.

## Files changed

- `docs/product-spec.md`: project-local copy of the user-supplied final specification.
- `docs/agent-state.md`: this long-task state record.
- `docs/ui-design.md`: approved design direction, tokens, responsive behavior, and accessibility contract.
- `docs/architecture.md`: domain, storage, content, versioning, and security decisions.
- `docs/superpowers/specs/2026-07-12-fde-arena-design.md`: implementable product design.
- `docs/superpowers/plans/2026-07-12-fde-arena-implementation.md`: twelve-task TDD implementation plan.
- `package.json`: project identity, verified Node/npm engine floor, and six exact production dependencies.
- `package-lock.json`: exact production dependency lockfile created by the user-run install.

## Current implementation status

- The full 2,460-line specification has been read.
- Repository audit is complete: only `.git/` existed at task start.
- UI design research is complete enough to draft the product design system.
- UI design, architecture, and implementation planning are complete and committed in `d5ef0d6`.
- Implementation branch `codex/fde-arena-mvp` is active.
- Production dependencies are installed and `npm ls --depth=0` reports the six expected packages.
- Development dependencies are installed with TypeScript 6.0.3, typescript-eslint 8.63.0, and ESLint 9.39.4.
- Task 1 is complete and independently approved: strict Vite/React tooling, HashRouter shell, theme tokens, smoke/regression tests, CI, lint, formatting, typecheck, and build.
- Task 2 is complete and independently approved: discriminated case schemas, status-safe TypeScript contracts, export envelope, generated JSON Schema, reference integrity, and fixtures.
- Node schemas include normalized `skillWeights` so later mastery updates are attributable to exact skills.
- Task 3 is complete and independently approved: evaluation, partial scoring, attempt scoring, branching, verdicts, mastery, and skill aggregation.
- Task 4 is complete and independently approved: bounded content CLIs, graph/duplicate/coverage audits, path safety, and deterministic published-only indexing.
- Task 5 is complete and independently approved: typed IndexedDB v1 repositories, immutable case versions, fixed local user bootstrap, transactional progress snapshots/clear, strict attempt invariants, and RFC3339 timestamp normalization.
- Task 6 is complete and independently approved: explicit five-phase training sessions, adaptive rounds/hints/reveal, real branch and consequence replay, resilient resume, atomic/idempotent completion, immutable attempt history, and case-aware persisted-path validation.
- Task 7 is complete and independently approved: Hash Router application shell, exclusive desktop/mobile navigation, modal mobile drawer, immersive training shell, route focus, themes, accessible evidence renderers, shared UI states, and responsive/reduced-motion CSS.
- Task 8 is complete and independently approved: all 12 node renderers, adaptive no-leak feedback, real training-service controller integration, responsive single-tree training layout, consequence aggregation, and cycle-safe progress.
- Task 9 Slice A is complete and independently approved: strict local-data portability, consistent/atomic IndexedDB replace, retryable repository bootstrap, deterministic five-tier recommendations, Dashboard, and URL-restored Case Library.

## Commands run and validation results

- `git rev-parse --show-toplevel`: confirmed the project root.
- `git status --short --branch`: clean, no commits on `main`.
- `rg --files`: no project files at task start.
- `python3 --version`: Python 3.9.6 is available for local UI guidance scripts.
- `ui-ux-pro-max` design-system and UX searches: completed without network or project writes.
- `git commit -m "docs: define fde arena architecture"`: created root commit `d5ef0d6`.
- `git switch -c codex/fde-arena-mvp`: created the isolated implementation branch.
- User-run production install: succeeded with zero reported vulnerabilities and exact versions in `package-lock.json`.
- User-run development install: failed atomically with `ERESOLVE`; no development dependencies were written.
- User-run development install after pinning compatible versions: succeeded in the project with zero reported vulnerabilities.
- `npm ls --depth=0`: production dependency tree is complete with no missing packages.
- Task 1 verification: 2 files and 3 tests passed; typecheck, lint, format check, and build all exited 0.
- Task 1 commits: `421ca03` and reviewer-fix `93890a0`; independent re-review found no remaining issues.
- Task 2 verification: 6 files and 94 tests passed; typecheck, lint, format check, and build all passed.
- Task 2 commits: `b5fc301` and reviewer-fix `0a03eeb`; independent re-review found no remaining issues.
- Task 2 addendum `431c9ce` adds reviewed node skill weights; 104 tests passed and the addendum review was clean.
- Task 3 verification: 12 files and 155 tests passed; typecheck, lint, format check, and build all passed.
- Task 3 commits: `29d0627` and reviewer-fix `5451c7b`; independent re-review found no remaining issues.
- Task 4 verification: 20 files and 195 tests passed; content check, typecheck, lint, format check, and build all passed.
- Task 4 commits: `d1425e5` and reviewer-fix `3333878`; independent re-review found no remaining issues.
- Task 5 verification: 21 files and 212 tests passed; typecheck, lint, format check, content checks, and build all passed.
- Task 5 commits: `0831e405`, reviewer-fix `ff2e46f4`, and timestamp hardening `6f22f7f8`; independent final re-review found no remaining issues.
- Task 6 verification: 24 files and 295 tests passed; content checks, typecheck, lint, format check, and build all passed.
- Task 6 commits: scoring/branch fixes `0ef7c064` and `1a5b68f2`, training service `c1320a6b`, persistence hardening `78ebaaa4`, completion immutability `71435a38`, and persisted-path validation `91c3c64e`; independent final re-review found no remaining issues.
- Task 7 verification: 28 files and 330 tests passed; content checks, typecheck, lint, format check, and build all passed.
- Task 7 commits: shell `49518144`, route-focus fix `ad4677e9`, accessibility hardening `a742bcf9`, and precise diff classification `ca6cb879`; independent final re-review found no remaining issues.
- Task 8 verification: 33 files and 373 tests passed; content checks, typecheck, lint, format check, and production build all passed.
- Task 8 commit: adaptive training renderers `2beb0520`; independent final re-review found no Critical, Important, or Minor issues.
- Task 9 Slice A verification: 37 files and 407 tests passed; content checks, build, typecheck, lint, and format check passed.
- Task 9 Slice A commit: product data foundation `a024c84a`; independent page and data re-reviews found no remaining Critical or Important issues.

## Remaining tasks

- Author, review, and publish the formal case corpus. The architecture and
  362-case coverage plan are present, but the bundled active catalog currently
  contains zero formal cases.
- Browser-driven E2E and manual assistive-technology checks remain separate
  delivery work; this architecture round completed unit/component/static
  accessibility, lint, type, deterministic-content, and production-build gates.
- Preserve the current uncommitted Slice B plus content-architecture work until
  the user chooses the normal Git integration step.

## Known risks

- Content quality remains the main product risk: no formal published case is
  bundled yet, and generated filler cannot substitute for reviewed FDE cases.
- Browser-based E2E execution may require a user-approved local server and
  Playwright browser binaries; neither was started or downloaded in this round.
- The production JavaScript chunk is 570.16 kB minified / 163.65 kB gzip. It
  meets the documented gzip target, although Vite emits its default raw-size
  advisory.

## Absolute do-not-touch boundaries

- No email or mailbox data.
- No browser profiles, cookies, history, sessions, or saved credentials.
- No proxy, VPN, DNS, Wi-Fi, network, or system configuration.
- No secrets, tokens, certificates, credential stores, or real `.env` files.
- No files outside this repository except the exact specification path explicitly authorized by the user.
- No global package-manager, Git, shell, Codex, or system configuration changes.

## 2026-07-14 Homepage Mission Command Center checkpoint

- Binding scope: execute the user-authorized read-only task file
  `/Users/charles/Downloads/FDE_Arena_Homepage_Mission_Command_Center_优化任务.md`
  without reopening the accepted visual direction or changing product
  architecture.
- Project root and working directory are both
  `/Users/charles/Documents/FDE网页题库`. The existing dirty worktree is being
  preserved; no reset, staging, commit, dependency install, service, or watch
  command is authorized.
- Dashboard information architecture now places Hero, Today's Mission, the
  four-stage Learning Path, and evidence-backed Achievements in the main
  column. The right rail contains real Level/XP, Skill Mastery radar, Attempt
  activity, and evidence-backed weak Skills; existing level progress and
  recent mistakes remain as secondary real-data panels.
- Today's Mission renders the authored `CaseSummary.scenarioSummary`, published
  case difficulty as explicitly labelled mission difficulty, authored estimated
  minutes, and labels resolved from active Skill definitions. Its recommendation reason
  still comes from the existing daily-plan selector; no scheduling, scoring,
  Mastery, Attempt, or persistence behavior changed.
- Hero and mission scenes remain dependency-free SVG/DOM visuals. They depict
  an engineer, system nodes, data flow, operational consoles, and an alert
  without encoding fake user or product metrics.
- Files modified for this task: `src/pages/dashboard/DashboardPage.tsx`,
  `src/pages/dashboard/DashboardVisuals.tsx`, `src/styles/global.css`,
  `src/i18n/translations/product-pages.ts`,
  `src/pages/product-pages.test.tsx`, `src/styles/shell.test.ts`, and this state
  checkpoint.
- TDD evidence: the first focused run failed because Hero was outside the main
  column and no 80rem two-column contract existed. The implemented structure
  then passed 2 files / 23 tests. A related regression batch passed 6 files / 78
  tests. Typecheck, full ESLint, focused Prettier check, and `git diff --check`
  all exited 0.
- Independent read-only review is complete with no remaining Critical,
  Important, or Minor findings after correcting the mission difficulty label
  and strengthening column/order regression assertions. The full Vitest suite
  and production build remain manual Terminal commands because
  the machine safety rules prohibit Codex from directly running full test
  suites or full builds.
- Known risk: the current repository contains substantial accepted uncommitted
  content and visual work from earlier phases, so final review must classify
  this task by the seven files above rather than treating the whole dirty
  worktree as newly created here.
- Do not touch Content Pack, Foundation content or logic, Case Schema, Training
  Engine, Mastery, Attempt, IndexedDB, accounts, cloud sync, email, browser
  profiles, proxy/network settings, credentials, real environment files, or
  global configuration.

## 2026-07-14 Foundation Knowledge Layer implementation checkpoint

- The binding task is the user-authorized read-only file
  `/Users/charles/Downloads/FDE_Arena_Foundation_Knowledge_System_实施任务.md`.
  It requires an independent beginner Foundation layer linked to existing
  Skills, Cases, and Mastery, with 30 MVP items and a pre-training prerequisite
  experience.
- The current working directory and project root are both
  `/Users/charles/Documents/FDE网页题库`; implementation continues on
  `codex/fde-arena-mvp` and must preserve the large existing dirty worktree.
- Approved design decision: Foundation is a separate bundled content layer
  under `content/foundation/**`, with its own strict Schema, deterministic
  generated index, and `FoundationSource`. It must not enter or modify
  `ContentPack`, `ContentManifest`, Content Pack checksum, `ContentInstaller`,
  or IndexedDB.
- Approved progress decision: Foundation status is a pure read projection over
  existing Skill Mastery and Case evidence. An item is mastered only when all
  linked Skills have samples and score at least 60 and at least one linked Case
  has a pass/excellent result. No localStorage or new database progress island
  is created.
- Approved training decision: `TrainingRoutePage` will show prerequisites before
  a new Attempt is created. A matching in-progress Attempt resumes directly;
  clicking the direct-start CTA calls the unchanged `createTrainingSession()`.
- The authored design is
  `docs/superpowers/specs/2026-07-14-foundation-knowledge-layer-design.md`; the
  executable TDD plan is
  `docs/superpowers/plans/2026-07-14-foundation-knowledge-layer.md`.
- Files changed so far in this task: the two documents above and this state
  checkpoint. No production code or content had been changed when this
  checkpoint was written.
- Pending work: Foundation contract/Schema/source; validation and generated
  artifacts; 30 authored items; pure progress selectors; Dashboard, overview,
  detail, routes, navigation, i18n, and responsive styles; prerequisite gate;
  real bundled integration test; bounded delivery verification.
- Read-only commands run: exact specification read; repository root/status/log
  inspection; targeted `rg`, `sed`, and `jq` inspection of content, routing,
  repositories, Mastery, training, i18n, and scripts. Formatting verification
  for the design and plan passed.
- Known risks: Foundation progress is capability evidence rather than reading
  completion; users may remain not-started after reading until they train. A
  third-party imported Content Pack may not contain bundled Foundation
  references, so runtime joins must degrade safely and never block training.
- Full test-suite and production-build commands are reserved for the user to
  run manually under the machine safety rules. Codex may run only focused tests,
  bounded dry-runs, typecheck/lint/format checks, and small Foundation indexing.
- This task must not access email, browser profiles, proxies, network/system
  settings, credentials, secrets, real environment files, or any project-external
  path other than the exact authorized specification. It must not install
  dependencies, start a server/watch process, stage/commit/reset/delete existing
  work, or modify global configuration.

## 2026-07-13 final content architecture directive

- The binding implementation input is the user-authorized file `/Users/charles/Downloads/给Codex的最终一次性实施Prompt.md`; it was read only and will not be modified.
- Continue on `codex/fde-arena-mvp`; do not reinitialize, reset, delete, or overwrite the existing uncommitted Task 9 Slice B work.
- Implement deterministic generated content artifacts, `ContentSource`, `ContentInstaller`, `ActiveContentCatalog`, additive historical case versions, dynamic Domain/Skill content, and the Settings content-pack workflow.
- Preserve the existing question engine, scoring, branching, mistakes, mastery, and user-data portability boundaries.
- The content layer uses a complete immutable `ContentPack` snapshot; installation validates before a single IndexedDB transaction and never mutates attempts, progress, mastery, mistakes, or settings.
- Current content schema version is 1. `migrate-v1-to-v2.ts` is only a typed unregistered placeholder; no unknown v2 design is permitted.
- No new dependency, service, backend, login, cloud sync, ZIP pack, URL download, signing system, CMS, or remote database is in scope.
- Planned verification: targeted red/green Vitest runs, deterministic generation checks, content validation/audit/check, full Vitest, typecheck, lint, format check, and production build.

## 2026-07-13 content architecture implementation checkpoint

- Phase A is implemented: schema/version metadata, Manifest/Domain/Skill/Coverage/ContentPack contracts, Zod schemas, and an empty v1 migration registry with an unregistered v2 placeholder.
- Phase B is implemented: deterministic `content:index`, byte-drift `content:check`, SHA-256 content hashes/checksum, generated Manifest/coverage report/loader map/JSON schemas, 15 domains, and the 362-case coverage plan.
- Phase C core is implemented: immutable bundled/file sources, browser-safe Web Crypto hashing, IndexedDB v2 additive migration, explicit ActiveContentCatalog, exact active-version queries, historical exact-version reads, single-transaction ContentInstaller, conflict detection, rollback, untrusted-input limits, and legacy Attempt schema normalization.
- Phase D is complete: all product pages read Domain/Skill definitions and exact
  active cases through repositories; no formal case imports or domain constants
  remain in pages.
- Phase E is complete: Settings shows catalog information, checksum status,
  per-domain counts, JSON Content Pack preview/install, restore bundled,
  content-status export, and separately labelled user-progress import/export.
- Application integration is complete: default bootstrap is
  `LocalContentSource -> ContentInstaller`, `ProductDataProvider` wraps the
  router, and Dashboard/Cases/Skills/Mistakes/Profile/Settings/Training/Debrief
  routes use the real pages.
- T1-T18 evidence includes a real fake-IndexedDB lifecycle: JSON import appears
  on unchanged pages; Pack A -> A+B preserves all five user stores; deprecated
  cases hide without deleting exact history; bundled restore preserves imported
  versions; failure injection rolls back content without touching user data;
  historical Domain/Skill labels remain available.
- Final verification is green: `content:validate` (0 cases, 15 domains, 15
  skills), `coverage:audit` (362 planned, zero published, informational gaps),
  deterministic `content:index`, `content:check` with zero drift, 50 test files
  and 507 tests, typecheck, lint with zero warnings, format check, and production
  build.
- No dependencies were installed, no network was used, no server/watch process was started, and no files outside the project were modified.

## 2026-07-13 FDE content production checkpoint

- Current goal: keep the approved content-platform architecture stable while moving into production standards, 24 published MVP cases, automated quality checks, and Settings coverage reporting.
- Binding scope: Phase 1 removes only the `ContentConfig.activeDomainIds` / `activeSkillIds` dual source; Phases 2–5 add authoring guides, 12 beginner + 8 intermediate + 4 advanced cases, a content-quality CLI, and progress toward the 362-case plan. CMS, backend, accounts, and cloud sync remain out of scope.
- Phase 1 is complete: `ContentConfig` and its strict Schema now contain only pack metadata plus `activeCases`; bundle validation no longer reads domain/skill activation lists; `ActiveContentCatalog` still carries lists derived exclusively from `DomainDefinition.status` and `SkillDefinition.status` in `ContentInstaller`.
- Phase 1 TDD evidence: the new contract test failed because the old Schema required both arrays, then passed after the minimal removal. Contract, complete-content validator, index generator, and installer suites passed: 4 files / 36 tests.
- Files changed so far in this phase: `src/content/contracts.ts`, `src/content/schemas.ts`, `src/content/content-contracts.test.ts`, `scripts/validate-content.ts`, `scripts/validate-content.test.ts`, `scripts/build-case-index.test.ts`, `content/manifests/content-config.json`, and `docs/superpowers/plans/2026-07-13-fde-content-production.md`.
- Pending work: finish the five production guides; author and publish the 24 cases; implement the quality gate and Settings coverage panel with RED/GREEN tests; regenerate artifacts; run the complete bounded verification matrix and final review.
- Commands run in this phase: read-only `git`/`rg`/`sed`/`find`; focused `npm run test:run -- src/content/content-contracts.test.ts`; focused four-suite GREEN command. No install, network, server, watch process, or project-external data access occurred.
- Known risk: the 24 cases are product content produced in this repository; automated checks can prove structural and editorial rules, but future subject-matter review should still version any substantive correction rather than silently replacing published v1 content.

## 2026-07-13 FDE content production final checkpoint

- This checkpoint supersedes the earlier zero-case and pending-production notes.
  All five requested phases are complete without changing the approved content
  platform architecture.
- Domain and skill activation now have one source of truth:
  `DomainDefinition.status` and `SkillDefinition.status`. `ContentConfig` no
  longer accepts `activeDomainIds` or `activeSkillIds`; the installer derives
  the active catalog lists from definition status.
- The authoring system now includes five project guides covering FDE case
  quality, scenario and evidence-chain design, decision nodes, causal
  distractors, explanations, review gates, stable taxonomy, and the three MVP
  difficulty levels.
- Content version `1.1.0` contains 24 published case versions: 12 beginner, 8
  intermediate, and 4 advanced. They contain 64 decision nodes, 128 evidence
  items, and 192 answer options across all 15 active domains. Ten of the twelve
  intermediate/advanced cases span at least three domains.
- Generated Manifest and coverage artifacts are synchronized with the case
  files. The 362-case plan has 24 active cases, 338 remaining, and 83.3% MVP
  cross-domain coverage against the configured 40% threshold.
- `content:quality` is a bounded CLI with `--dry-run`, `--limit`, `--input`, and
  `--output`. It checks schema-valid case shape, active skill/domain tags,
  difficulty depth, substantive scenario and evidence chains, decision quality,
  causal distractor explanations, causal root cause, corrective remediation,
  and observable verification. It runs before the deterministic content check
  in the production build.
- Settings now reads installed catalog, active cases, and coverage data at
  runtime. It shows total and per-difficulty counts, all active-domain coverage
  (including zero-count domains), and current/target/remaining/progress toward
  the configured 362-case target; no case total or domain list is hard-coded.
- Final content gates are green: 24 cases, 15 domains, 15 skills, zero schema,
  graph, duplicate, or quality issues; deterministic drift is empty; coverage
  audit passes.
- Final engineering verification is green: 51 Vitest files / 527 tests,
  TypeScript typecheck, ESLint with zero warnings, Prettier check, and production
  build. Independent final review reports no remaining Critical or Important
  findings.
- Vite still emits its non-blocking raw chunk-size advisory for the 588.34 kB
  minified main chunk (166.84 kB gzip). No server or browser-driven E2E run was
  started because that requires separate approval under the project safety
  rules.
- No dependencies were installed, no network was used, no service/watch process
  was started, no existing work was reset or deleted, and no files outside the
  project were modified.

## 2026-07-13 seven-day MVP implementation final checkpoint

- The binding implementation task was the user-authorized read-only file
  `/Users/charles/Downloads/FDE_Arena_7天快速MVP实施任务 (1).md`. The approved
  content architecture was not reopened or extended.
- Content Pack `1.2.0` keeps all 24 active cases and all v1 files. Three
  immutable v2 case versions are added and active: multi-region RAG now defines
  a 99.9% within-120-seconds freshness SLO and release gate; webhook fulfillment
  uses an atomic ledger plus transactional outbox with crash recovery; customer
  pilot expansion uses measurable 14-day correction, rollback, queue, and P1
  response gates. The pack contains 27 total case versions.
- `buildDailyTrainingPlan()` is a pure, non-persisted planner over active cases,
  progress, mastery, mistakes, and completed attempts. It returns at most three
  unique cases and ranks critical risk, mastery below 40, recent failure,
  transfer verification, unfinished work, then stable fallback. Invalid dates
  are ignored and the latest same-day completion retains its Attempt ID and
  score.
- Dashboard now presents Today's Training, Focus Case, recommendation reason,
  completed/planned progress, estimated minutes, next recommendations, one
  primary unfinished-case CTA, and Completed/Review actions for same-day work.
- Training completion now links the real completed Attempt to exact Debrief and
  returns to today's plan. Training routing queries the fixed local user and
  active case, resumes the latest in-progress Attempt with the exact active
  case version, and creates a session only when no matching Attempt exists.
  Invalid persisted history surfaces the existing retryable error without
  overwriting user data.
- A real bundled-content integration test installs the complete Content Pack
  through ContentInstaller into fake IndexedDB, completes the correct path of a
  published FDE case, records a 100-point completed Attempt, updates Progress
  and Skill Mastery atomically, renders exact-version Debrief, and confirms the
  Dashboard's same-day completion and Review link.
- Content verification is green: 27 valid case versions, 24 active published
  cases, 15 domains, 15 skills, zero schema/graph/duplicate/quality issues,
  passing 24/362 coverage audit, and zero generated-content drift.
- Engineering verification is green: 52 Vitest files / 539 tests, TypeScript,
  ESLint with zero warnings, Prettier, and production build. Independent final
  review found no Critical, Important, or Minor findings and marked the MVP
  implementation ready.
- The daily plan deliberately remains local and derived, so remaining
  recommendations may adapt after Mastery changes. No CMS, backend, login,
  cloud sync, community, AI generation, new database design, dependency,
  network access, or server/watch process was added.
- Vite retains its non-blocking main-chunk advisory: 595.84 kB minified / 168.53
  kB gzip. Browser-driven visual inspection remains a separate user-approved
  activity because no local server was started in this task.

## 2026-07-13 localization implementation checkpoint

- Current goal: execute the user-authorized read-only task file
  `/Users/charles/Downloads/FDE_Arena_中文化与国际化实施任务.md` without reopening
  the approved architecture.
- Scope is presentation-only: add Simplified Chinese and English UI strings,
  a shared top-bar/Settings language preference, deterministic Simplified
  Chinese first-open behavior, and local preference persistence. Content Pack,
  Case Schema, Training/Scoring/Mastery engines, Attempt records, and IndexedDB
  structures are immutable boundaries.
- Formal case titles, scenarios, evidence, options, explanations, and debrief
  content remain authored Content Pack data and are rendered unchanged. Program
  labels and business-produced display enums are translated only at the view
  boundary.
- Implemented so far: TDD coverage for default language, no browser-language
  detection, malformed preference fallback, persistence, and synchronized
  controls; `I18nProvider`; `zh-CN` / `en-US` dictionaries; compact language
  control; root provider; initial HTML language/description; and base control
  styling.
- Parallel work in progress: shell/routes/Settings, six product pages, and the
  complete training/component path. Each group owns a separate translation
  fragment so concurrent edits do not touch the same dictionary file.
- Commands run in this phase: read-only `rg`/`sed`; two focused Vitest runs for
  the i18n runtime (first RED because the module did not exist, then 4 GREEN
  tests). No dependency install, network call, service/watch process, or
  project-external write occurred.
- Pending: merge translation fragments, add static key/parity and UI integration
  tests, audit residual program strings, run bounded full verification, and
  perform final code review.

## 2026-07-13 localization implementation final checkpoint

- The localization task is complete as a presentation-only change. Simplified
  Chinese is the deterministic first-open language, browser locale is never
  consulted, English remains available, and the shared preference is persisted
  as JSON under `fde-arena:i18n`. The document `lang` attribute is synchronized
  before paint and storage failures do not prevent switching.
- `src/i18n/` now owns the runtime plus matching `zh-CN` and `en-US`
  dictionaries. Dashboard, Cases, Training, Debrief, Mistakes, Skills, Profile,
  Settings, desktop/mobile navigation, loading/error states, controls, status
  labels, and accessible names render through the translation boundary. The
  top-bar, mobile/training shells, and Settings radio controls share one live
  language state.
- Protected technical vocabulary remains in English where required, including
  FDE, Agent, RAG, LLM, Prompt, Embedding, Vector Database, Tool Calling, Eval,
  Guardrails, MCP, Memory, Mastery, API, HTTP, JSON, Docker, Kubernetes, Git,
  SQL, CI/CD, SDK, OAuth, Webhook, and Token.
- Content-authored titles, scenarios, evidence, answers, explanations, domain
  labels, and skill labels deliberately remain unchanged Content Pack data. An
  English UI can therefore still display Chinese authored case content; adding
  translated case content requires a separately versioned Content Pack and was
  outside this task's explicit immutable-data boundary.
- Static safeguards verify dictionary parity/non-empty values, every literal
  key, dynamic `*Keys` registries and `labelKey` properties, absence of Chinese
  program copy in production TSX, absence of Chinese in the English dictionary,
  visible literal props/JSX, and protected vocabulary. Runtime tests cover
  deterministic defaulting, persistence, malformed/blocked storage, synchronized
  controls, error-language isolation, and Chinese rendering while authored
  Content Pack copy stays raw.
- Final verification is green: `npm test -- --run` reports 54 files / 559 tests;
  `npm run typecheck`, `npm run lint`, and `npm run format:check` pass; production
  build passes content quality for 27 case versions, 15 domains, and 15 skills
  with zero issues and zero generated-index drift. Independent review found no
  remaining P0, P1, or P2 findings.
- Vite retains a non-blocking main-chunk advisory at 662.88 kB minified / 185.13
  kB gzip. No dependency was added, no network was used, no service/watch process
  was started, no existing work was reset or deleted, and no project-external
  file was modified. Browser-driven visual inspection remains a separately
  approved activity because this task did not start a local server.
- Pending implementation work: none. Do not alter Content Pack, Case Schema,
  Training/Scoring/Mastery behavior, Attempt records, or IndexedDB structures as
  part of future UI-only language additions.

## 2026-07-13 real-user experience validation checkpoint

- The binding task is the user-authorized read-only file
  `/Users/charles/Downloads/FDE_Arena_中文化验收后下一阶段任务执行文档.md`.
  Architecture and localization remain approved and were not redesigned.
- Scope is the existing Dashboard → Today's Training → case → score → Mastery
  → Debrief → Dashboard loop plus a read-only quality review of the ten launch
  cases. Content Pack, Case Schema, Training/Scoring/Mastery engines, Attempt,
  and IndexedDB remain immutable boundaries.
- Three independent read-only audits found no P0 blocker. The ten configured
  launch versions all pass automated and human editorial review. Historical v1
  versions of multi-region RAG, webhook idempotency, and customer pilot remain
  installed for compatibility but their stronger v2 versions are active.
- Presentation-only TDD fixes now expose the Mastery update and `/skills` link
  after completion, close Debrief with a return-to-plan action, map node/option
  IDs to authored labels, hide unknown internal error slugs behind a localized
  generic label, default-open mobile Evidence, keep mobile feedback next to
  retry controls, and provide/focus the Training page title on ready/completed
  transitions.
- Focused RED/GREEN evidence is complete for each behavior. Final fresh content
  gates pass for 27 versions, 15 domains, and 15 skills with zero validation,
  quality, graph, duplicate-ID, or generated-drift issues; the 24/362 coverage
  audit passes. Final engineering gates pass with 54 test files / 563 tests,
  TypeScript, ESLint with zero warnings, Prettier, and production build.
- The production build reports only Vite's non-blocking main-chunk advisory:
  664.37 kB minified / 185.42 kB gzip.
- Independent final re-review accepted the untitled-node fallback fix and the
  case-global option-ID uniqueness invariant, and reported no remaining
  Critical, Important, or Minor issue in this phase's reviewed scope.
- Browser visual validation was not run: project safety rules prohibit starting
  a dev server or using browser automation without separate approval. The
  project-local manual matrix is
  `docs/reviews/FDE_Arena_真实用户体验验收记录.md`; automated evidence must not
  be represented as real browser evidence.
- Remaining P1 experience risk: rotating an iPad across the 64rem layout
  breakpoint remounts local question-draft state and may discard an unsubmitted
  choice. Other known limits are no explicit Mastery before/after delta and
  Chinese authored case content inside the English program UI.
- No dependency, network call, server/watch process, browser automation,
  external write, data migration, account, backend, CMS, cloud sync, or AI
  authoring was added.

## 2026-07-14 Foundation Knowledge Layer final checkpoint

- Goal: add the user-authorized Foundation Knowledge Layer and connect it to
  existing stable Skill, Case, Attempt, and Mastery evidence without reopening
  the approved FDE Arena architecture. The binding task file was read-only;
  all writes remained inside this project.
- Architecture boundary: Foundation is a separately validated and generated
  bundled layer under `content/foundation`. It is intentionally excluded from
  `ContentPack`, `ContentManifest`, the pack checksum, `ContentInstaller`, and
  IndexedDB. No Case Schema, Training/Scoring/Mastery algorithm, Attempt shape,
  repository contract, database version/store, or user-data migration changed.
- Content contract: `schemaVersion: 1`, stable Foundation ID, one of three MVP
  tracks, explicit authoring order/time, five substantive explanation fields,
  a strict one-sentence simple explanation, stable active Skill IDs, and stable
  active Case IDs. The strict Zod Schema, parity-tested generated JSON Schema,
  deterministic lazy index, cached/frozen local source,
  duplicate/reference/path validation, and artifact drift checks are in place.
- Corpus: 30 authored Chinese beginner knowledge items are indexed as 10
  computer basics, 10 network/API, and 10 AI basics. Representative stable IDs
  include `api-basic`, `http-request-basic`, `rag-basic`, and `agent-basic`.
  Empty future module directories contain placeholders only; no future content
  or unknown Schema version was invented.
- Progress: Foundation status is a pure projection over existing Skill Mastery
  and immutable Attempt history. Mastery requires every linked Skill to have a
  sample and score at least 60 plus a completed related Case verdict of pass or
  excellent. No reading-completion store or localStorage progress island was
  added; historical passes remain evidence while current Skill scores still
  govern readiness.
- Experience: Dashboard keeps Today's Training first and adds a compact
  Foundation panel afterward. `/foundation` groups all three tracks with native
  overall/per-track progress and a deterministic next item;
  `/foundation/:foundationId` renders the five authored sections, human Skill
  labels/current Mastery, and explicit Start Case actions for active related
  Cases. Desktop navigation and the mobile More drawer include the new
  destination. UI chrome has matching zh-CN/en-US keys; authored Chinese
  knowledge remains unchanged when English chrome is selected.
- Training boundary: matching exact-version in-progress Attempts resume before
  Foundation loads. A new Case with any related Foundation prerequisites
  renders an advisory, zero-write confirmation gate, including when those items
  are already mastered; the learner may study or explicitly start. Loading,
  error, inactive, gate, and ready training states keep a valid shell name and
  focus target. Initial save failures remain retryable, optional
  Foundation/Mastery/history reads fail open, Case route changes reset session
  identity/UI, and a stale deferred loader is stopped before it initiates a
  write. A repository write that has already started is not claimed to be
  cancellable.
- Real integration: `api-basic` is resolved through the real 30-item generated
  index, a real bundled Content Pack is installed into fake IndexedDB, detail
  and prerequisite views keep Attempt/Progress empty, direct start writes one
  in-progress Attempt, the real correct path commits completed Attempt,
  CaseProgress, and SkillMastery, and Debrief reloads the Attempt's exact v1
  after a deliberately different v2 is also stored and presented as active.
- Review corrections: async detail headings now preserve route focus and show
  distinct loading/error/ready/not-found titles; partial content-quality input
  no longer produces unrelated Foundation reference errors; route save retry,
  optional-evidence fail-open, cross-Case Attempt IDs, stale loaders, missing
  exact versions, historical Debrief discrimination, generated-Schema parity,
  strict one-sentence simple explanations, overall library progress, explicit
  Start Case CTAs, mastered-item confirmation gates, and immersive async-state
  focus (including inactive Cases) all have regressions.
- Fresh bounded verification: 15 focused Vitest files / 131 tests pass;
  `content:validate -- --dry-run --limit 10` reports 10 Cases, 10 Foundation
  items, 15 Domains, 15 Skills, and zero issues; `content:index -- --dry-run
  --limit 10` reports a write-free 10/10 sample; TypeScript, ESLint with zero
  warnings, full Prettier check, and `git diff --check` pass.
- Final independent review is `Ready: Yes`, with no Critical or Important
  finding. Its sole Minor is the honestly documented, non-retroactively-fixable
  Task 7 RED-process deviation; it is not a current product defect. The report
  is `.superpowers/sdd/foundation-final-review.md`.
- Full-suite/build boundary: Codex did not run the full test suite, full content
  pipeline, or production build because machine safety rules reserve commands
  that may exceed two minutes for the user. The user-owned command is:

  ```bash
  cd "/Users/charles/Documents/FDE网页题库" && \
  npm run content:index && \
  npm run content:validate && \
  npm run content:quality && \
  npm run content:graph && \
  npm run content:duplicates && \
  npm run coverage:audit && \
  npm run content:check && \
  npm test -- --run && \
  npm run typecheck && \
  npm run lint && \
  npm run format:check && \
  npm run build && \
  git diff --check
  ```

- Do not touch: email/browser profiles, proxy/network/system settings,
  credentials/secrets/real environment files, global configuration, or paths
  outside this project. Do not install dependencies, start services/watch mode,
  stage/commit/reset/delete the dirty worktree, or represent automated checks as
  browser validation. No browser visual run was performed.

## 2026-07-14 final visual upgrade checkpoint

- The binding read-only task is
  `/Users/charles/Downloads/FDE_Arena_最终视觉升级实施任务_按选定参考稿.md`.
  The user has already approved its first reference direction; no new visual
  exploration or second design review is authorized.
- Before this visual phase, the accumulated content platform, MVP, localization,
  real-user UX, and Foundation work reached a clean safe commit point:
  `78f66e65 feat: complete content-driven learning platform` on
  `codex/fde-arena-mvp`. It has not been pushed or merged.
- Current cwd and project root are both
  `/Users/charles/Documents/FDE网页题库`. Planned writes are limited to visual
  tokens/styles, existing React presentation components/pages, i18n program
  chrome, focused tests, and project-local implementation/review documentation.
- Approved implementation direction is recorded in
  `docs/superpowers/specs/2026-07-14-final-visual-upgrade.md`; the ordered plan is
  `docs/superpowers/plans/2026-07-14-final-visual-upgrade.md`.
- The project contains no image/font assets and no chart dependency. The Hero,
  level form, radar, and supporting visuals will use existing Phosphor icons,
  CSS, real DOM, and accessible inline SVG only. No dependency or network access
  is needed.
- Hard invariants: do not modify Content Pack, Case/Foundation Schemas, Training
  Engine, scoring, Mastery, Attempt, IndexedDB, migrations, stable IDs, or user
  data. New dashboard metrics are pure presentations of existing repository
  data.
- Planned commands are focused Vitest files, TypeScript, ESLint, Prettier, and
  `git diff --check`. No install, service/watch process, full suite, full build,
  browser automation, or external write will be run by Codex.
- Do not touch email/browser profiles, proxy/network/system settings,
  credentials/secrets/real environment files, global configuration, or any
  project-external path other than the exact authorized task document.

## 2026-07-14 final visual upgrade completion

- Outcome: the approved first-reference direction is implemented as a dark,
  professional AI training system without reopening product architecture or
  exploring another style. The pre-visual safe checkpoint remains commit
  `78f66e65 feat: complete content-driven learning platform`; the visual work
  is intentionally left unstaged and uncommitted for user review.
- Presentation changes are limited to `index.html`, design documentation,
  tokens/global styles, the application shell/theme, Dashboard, Foundation,
  Case Library, Training presentation, Debrief presentation, localized program
  chrome, and focused tests. Content Pack, Case/Foundation Schemas, engine,
  scoring, Mastery writes, Attempt records, repositories, IndexedDB, migrations,
  stable IDs, and authored content were not changed.
- Dashboard now renders the Hero first, today's real training mission, learning
  paths, local-day activity calendar, monotonic lifetime XP with the next
  500-point milestone, mastery radar with a text alternative, achievements,
  and a responsive growth rail. All metrics remain projections of existing
  Cases, progress, Attempts, mistakes, Mastery, and Foundation data.
- Foundation now has track-oriented library presentation, a reading/detail
  layout, a localized accessible chapter navigator, stable focusable chapter
  targets, Skill context, and related Case actions. Chapter clicks explicitly
  preserve the production HashRouter route, focus the target, and scroll it
  into view.
- Case Library uses incident-oriented cards; Training presents one existing
  semantic subtree as Customer Incident Mode across desktop/mobile; Debrief is
  an engineering report with recorded-versus-recommended paths, decision
  timeline, authored root cause/remediation/verification, and an explicit
  Skill impact section derived only from visited historical node
  `skillWeights`. It states that Attempt has no before/after Mastery snapshot
  and therefore does not fabricate a score delta.
- The global command bar still routes to the existing Case filter and now
  accurately promises title/scenario search only. Default theme is dark, while
  existing light/dark/system choices remain available. Initial HTML paints the
  dark theme before React mounts to avoid a light flash.
- TDD regressions cover Dashboard Hero placement, local-calendar timestamps,
  lifetime XP across a 500-point boundary, Foundation chapter semantics,
  production HashRouter preservation/focus, Debrief Skill impact provenance,
  default theme, shell search, and the major visual structure hooks.
- Fresh bounded verification: 12 focused Vitest files / 117 tests pass;
  TypeScript build checking passes; ESLint passes with zero warnings; Prettier
  check passes; `git diff --check 78f66e65` passes. Final independent read-only
  review reports `Ready: Yes` with no Critical or Important finding.
- Full-suite/build boundary: Codex did not run the full test suite or production
  build because machine safety rules reserve commands that may exceed two
  minutes for the user. The user-owned verification command is:

  ```bash
  cd "/Users/charles/Documents/FDE网页题库" && \
  npm test -- --run && \
  npm run typecheck && \
  npm run lint && \
  npm run format:check && \
  npm run build && \
  git diff --check
  ```

- Browser/responsive visual validation was not run because starting a service
  and using browser automation require separate approval. No install, network
  call, server/watch process, external write, process kill, staging, reset,
  push, or merge was performed during the visual phase.
- Remaining handoff: the user may run the full command and manually inspect
  375/768/1024/1440 widths plus mobile landscape. Do not touch email/browser
  profiles, proxy/network/system settings, credentials/secrets/real environment
  files, global configuration, or paths outside this project.

## 2026-07-14 Foundation 100-item MVP delivery checkpoint

- The latest binding objective is limited to expanding the existing Foundation
  corpus from 30 to exactly 100 items. No UI, Schema, Training Engine, Mastery,
  persistence, CMS, backend, account, or cloud-sync change is authorized.
- Exactly 70 authored Chinese items were added: 10 Computer Basics, 30
  Network/API, 20 AI Basics, and 10 FDE Methodology. Every item contains the
  existing five required explanation fields and stable active Skill/Case
  references; no empty encyclopedia-style placeholders were added.
- Schema-preserving classification decision: the existing closed track type is
  unchanged. The 10 methodology items use the independent
  `domain: fde-methodology` classification while reusing the existing
  `computer-basics` track. The visible track totals are therefore 30 Computer,
  40 Network/API, and 30 AI; domain counts distinguish 20 Computer Basics from
  10 FDE Methodology.
- Corpus metrics: 100 items, 204 Skill edges across all 15 active Skills, and
  135 Case edges across 23 published Cases. The 70 new items contribute 159
  Skill edges across 14 Skills and 95 Case edges across 21 Cases.
- Test contract changes are limited to the existing Foundation corpus and
  integration tests: they now require 100 stable IDs/orders, the exact
  distribution above, representative new IDs, and a 100-item generated index.
  `.prettierignore` now correctly treats the deterministic generated Foundation
  index the same way as the existing generated content index.
- Final content gates after the last editorial correction are green:
  `content:index`, `content:validate` (100 Foundations, 27 Cases, 15 Domains,
  15 Skills, zero issues), `content:quality` (zero validation/quality issues),
  `content:check` (zero drift), and the two focused Foundation tests.
- The complete Vitest suite was executed in four bounded batches under the
  machine safety limit: all 60 files / 628 tests passed. No single long-running
  full-suite process was started. Fresh final TypeScript, ESLint (zero
  warnings), Prettier, and `git diff --check` runs all exit successfully.
- Independent cross-review passed for the Computer, Network/API, AI, and FDE
  Methodology additions. Twelve Network/API examples were corrected to match
  their linked Case evidence, and the final API Key example was linked to the
  real staged credential-rotation Case before receiving a final PASS.
- The production bundle is intentionally not run by Codex because the global
  machine safety rules reserve full builds that may exceed two minutes for the
  user. Deployment therefore remains pending the user-owned command
  `cd "/Users/charles/Documents/FDE网页题库" && npm run build`.
- Existing accepted visual-upgrade changes remain untouched and uncommitted.
  Do not install dependencies, start services/watch mode, stage/commit/reset,
  access external personal/system data, or modify anything outside this project.

## 2026-07-14 Case system and learning-loop enhancement checkpoint

- The binding task is the user-authorized read-only file
  `/Users/charles/Downloads/FDE_Arena_下一阶段案例体系增强任务.md`.
  Foundation remains fixed at 100 items; the approved architecture, Schemas,
  Training Engine, Mastery writes, IndexedDB design, and visual direction must
  not be redesigned.
- Repository facts correct the apparent count mismatch: there are 27 Case
  version files but 24 active stable Case IDs because three cases retain a v2
  beside v1 history. The target is exactly 50 active Case IDs, so this phase
  adds 26 new v1 cases rather than 23.
- Planned content distribution is assessed against the required beginner
  Linux/HTTP/API/Docker/config/Git scenarios, intermediate RAG/Agent/API/data/
  authorization/third-party scenarios, and advanced enterprise AI/multi-Agent/
  large-RAG/cost/reliability/customer-delivery incidents. Every new case must
  follow the existing difficulty node floors, evidence/decision/debrief quality
  gates, stable IDs, published metadata, and active Domain/Skill taxonomy.
- The Foundation-to-Case audit must keep every Foundation linked to active
  Skills and real active Cases, remove no historical link, and add accurate
  links for the new cases. Foundation count and Schema remain unchanged.
- Recommendation work is limited to pure selectors and existing pages. It may
  combine Foundation, Skill Mastery, Mistakes, Attempts, and active Case data,
  but it may not add a store, persistence field, content contract, or database
  migration. The four-step FDE path is a projection of existing Foundation and
  Skill evidence.
- TDD order: first lock the 50-case and link/recommendation/path behavior in
  focused failing tests; then add content and minimal selectors/presentation;
  finally regenerate deterministic artifacts and run content gates, bounded
  Vitest batches, typecheck, lint, format, and diff checks.
- Current project root and cwd are
  `/Users/charles/Documents/FDE网页题库` on `codex/fde-arena-mvp`. Existing
  accepted visual and Foundation changes are dirty and must be preserved; no
  stage, commit, reset, branch switch, worktree creation, dependency install,
  external write, or destructive command is authorized.
- The user-approved Vite service remains running at `127.0.0.1:5173` with PID
  36857. Do not stop or restart it during implementation unless the user asks.
- Full build is reserved for a user-run terminal command if it may exceed the
  two-minute machine safety limit. No email/browser profile, proxy/network,
  credential, secret, real environment file, or system/global configuration
  access is permitted.

## 2026-07-14 Case system and learning-loop delivery

- The active bundled Content Pack is now `1.3.0` with exactly 50 active Case
  IDs and 53 retained Case version files. The active level distribution is 22
  beginner, 18 intermediate, and 10 advanced; coverage is 50/362 with 312
  planned cases remaining.
- This phase added exactly 26 authored Cases: 10 beginner, 10 intermediate,
  and 6 advanced. Together they contain 74 decision nodes, 166 evidence items,
  222 options, and 79 Case-to-Skill edges spanning all 15 active Skills.
- Foundation remains fixed at 100 items. The corpus now has 205
  Foundation-to-Skill edges and 162 Foundation-to-Case edges; every one of the
  50 active Cases has at least one incoming Foundation relation, and every
  relation shares an active Skill with its Case. No Schema, repository,
  IndexedDB, Training Engine, or Mastery write contract changed.
- Daily planning now combines active Case data with Skill Mastery, unresolved
  Mistakes, complete Attempt history, and Foundation relations. A critical
  Mistake is resolved only by a later clean pass that correctly revisits the
  same stable node without revealing the answer. Historical/deprecated source
  attempts may resolve old mistakes but can never enter the active daily list.
- The Dashboard pairs the first unfinished recommended Case with a related,
  non-mastered Foundation sharing an active Skill, prioritizes a weak shared
  Skill, and uses stable order/ID tie-breaking. The visible learning path is
  Foundation software -> network/API -> AI -> real customer Case practice.
  Foundation detail links active related Cases without claiming that an
  untracked reading event has already been completed.
- Independent content review approved all three new difficulty batches after
  correcting evidence gaps around allowed-query guardrails, canary routing vs
  atomic alias swaps, calibrated quality routing, streaming units, adoption
  claims, write-before-contract discovery, and retry-amplification wording.
  Final review findings are 0 Critical, 0 Important, and 0 Minor.
- Deterministic artifacts were regenerated: content manifest, coverage report,
  JSON Schemas, content index, and Foundation index. Final content gates all
  pass: validate 53 Cases/100 Foundations/15 Domains/15 Skills, quality zero
  issues, graph 53/53, duplicates zero, coverage pass, and content drift zero.
- The complete Vitest inventory was run in four bounded batches: 60 files and
  635 tests passed. A fresh affected-file run after formatting passed 4 files /
  48 tests. Final typecheck, ESLint with zero warnings, Prettier, and
  `git diff --check` all pass.
- The full production build was not run because the machine rules reserve full
  builds for a user-owned terminal command. Deployment remains pending
  `cd "/Users/charles/Documents/FDE网页题库" && npm run build`.
  The previously approved Vite process is no longer listening on port 5173;
  do not restart it without explicit approval. No dependency install, stage,
  commit, reset, branch switch, external write, or destructive repository
  operation was performed.

## 2026-07-14 FDE Concept Layer implementation checkpoint

- Binding task: the user-authorized read-only file
  `/Users/charles/Downloads/FDE_Arena_FDE_Concept_Layer_实施任务.md`. The goal is
  an additive concept bridge between 100 Foundation items and 50 active Cases;
  it is not another Foundation expansion.
- Current cwd and project root are both
  `/Users/charles/Documents/FDE网页题库` on the existing
  `codex/fde-arena-mvp` branch. The large accepted dirty worktree must be
  preserved; no reset, stage, commit, branch/worktree change, dependency
  install, service, or watch process is authorized.
- Architectural resolution: Concept JSON owns stable Foundation and Case ID
  references. Runtime/generated reverse indexes provide Foundation
  `relatedConcepts` and Case `requiredConcepts` behavior without adding fields
  to Foundation or Case Schema and without placing Concept data in Content
  Pack, Manifest, IndexedDB, Attempt, Mastery, or Training Engine state.
- The attachment names 53 terms but requires exactly 50 Concepts. All terms
  remain covered by combining Request/Response, Timeout/Retry, and Tool
  Calling/Function Calling into three paired Concepts. Authentication Token and
  LLM Token remain distinct; Approval Token is covered by Authorization and
  Agent Orchestrator by Agent.
- Planned implementation scope: `content/concepts/**`; Concept domain type,
  strict Schema, local source and deterministic generated index; validation and
  quality integration; pure relation selectors; Foundation detail concept
  bridge; non-blocking pre-Case concept preview; in-session clickable concept
  glossary with session-local newcomer labels; i18n, CSS, tests, and this state
  file.
- TDD order: first capture missing Schema/source/index/relation behavior in RED
  tests, then author and validate exactly 50 Concepts, then capture and
  implement the advisory UI flow. Concept load failures must fail open and may
  never create or mutate an Attempt.
- Validation will be bounded and project-local: focused Vitest, small content
  dry-runs/checks where safe, typecheck, lint, format, and diff checks. The full
  Vitest suite and production build remain user-run commands under the machine
  safety rules.
- Absolute exclusions: no changes to Content Pack, Content Manifest checksum,
  Foundation/Case core Schema, Training Engine, scoring, Mastery, Attempt,
  IndexedDB, accounts, cloud sync, browser/email/proxy/network/credential data,
  real environment files, or global configuration.

## 2026-07-14 FDE Concept Layer delivery checkpoint

- Added exactly 50 authored Concept JSON files under `content/concepts`: 12
  API/Backend, 13 System, 15 AI, and 10 FDE. The corpus has 142 Concept-to-
  Foundation edges covering all 100 Foundation IDs and 119 Concept-to-Case
  edges covering all 50 active Case IDs.
- Added a Concept-owned strict v1 Schema, lazy `LocalConceptSource` with
  cross-file duplicate-ID rejection, deterministic generated Concept index and
  authoring JSON Schema, pure stable-ID reverse selectors, and Concept-aware
  validation/quality reporting. Concepts remain a sidecar layer and are
  deliberately excluded from Content Pack, Manifest, checksum, repositories,
  IndexedDB, Attempt, Mastery, and Training state.
- Foundation detail now derives and displays related Concepts. New Case starts
  show an advisory concept preview before the existing Foundation preparation
  list; viewing explanations performs no write, and `继续案例` / `Continue
  Case` is the only action that creates the existing Attempt. Resumed Attempts
  skip the gate but still receive the read-only Case glossary.
- Case terminology is exposed as explicit canonical term buttons rather than
  unsafe text replacement. The first label uses authored Chinese context plus
  the English technical term; after the explanation is viewed, that component
  shows the English term. Familiarity and expansion state are React-local and
  are never persisted.
- Concept consumers hydrate independently. A rejected or never-settling
  Concept source cannot block Foundation reading, Continue, or existing
  Attempt recovery. Every new Case uses a zero-write confirmation gate, so only
  an explicit Continue creates an Attempt; resumed Attempts render immediately.
- Fresh gates completed so far: `content:index`; `content:validate` (53 Cases,
  15 Domains, 15 Skills, 100 Foundations, 50 Concepts, zero issues);
  `content:quality` (53 Cases/50 Concepts, zero issues); `content:check` (zero
  drift); focused Concept/UI/content/CLI regression (16 files, 149 tests);
  TypeScript; ESLint with zero warnings; targeted Prettier; and scoped
  `git diff --check`.
- Independent pipeline/content and UI/accessibility reviews both returned
  READY with zero remaining Critical or Important findings.
- The complete Vitest suite and production build remain user-run commands under
  the machine safety rule for potentially long full-suite/build operations.
  No dependency install, server/watch process, stage/commit/reset, external
  write, or protected personal/system data access was performed.

## 2026-07-15 Onboarding UX Polish delivery checkpoint

- New User Mode now treats completed Case progress, completed Attempts, and
  Mastery with real samples as the only activation evidence. In-progress work
  alone keeps the focused first-time experience.
- While New User Mode is active, First Mission is the sole primary path and the
  existing Dashboard remains available inside a default-collapsed Explore
  Later section. Active learners retain the previous Dashboard layout.
- A First Mission can be completed only after its matching Foundation route was
  visited in the current session. Successful progression clears visit evidence
  so a previously visited future mission cannot be skipped.
- Foundation reading is explicitly separated from Mastery evidence. The Case
  preparation view distinguishes core Concepts from recommended Foundation
  supplements and remains non-blocking and zero-write until Continue.
- Final targeted verification passed 8 files / 100 tests, including i18n and
  CSS contracts; i18n coverage passed 7/7; TypeScript and full ESLint pass.
  Independent final review found zero Critical, Important, or Minor findings.
  Full Vitest and production build remain user-run under the machine safety
  limit.
- Scoped Prettier and `git diff --check` pass. Full-project `format:check`
  remains blocked only by the pre-existing, out-of-scope formatting difference
  in `src/content/foundation-training-flow.integration.test.tsx`; it was not
  rewritten as part of this task.
- Persistent delivery convention: after every future implementation task,
  Codex must automatically refresh the concise `docs/review-state.md` status
  package without waiting for the user to request it again.
- Boundaries preserved: no Content Pack, core Schema, Training Engine, Mastery
  write, Attempt, IndexedDB, dependency, service, browser state, protected
  personal/system data, Git stage/commit/reset, or destructive operation changes.

## 2026-07-16 AI Growth OS Dashboard delivery checkpoint

- Reworked only the presentation/information architecture around the existing
  Dashboard and application shell. The page now expresses goal, readiness,
  capability diagnosis, evidence, and the next engineering challenge while
  continuing to read existing Case, Attempt, Progress, Skill, and Mastery data.
- Added a local-rules mentor seam that is explicitly labeled as non-AI. No AI
  API, backend, account, cloud sync, CMS, or new dependency was introduced.
- Capability nodes use existing stable Skill IDs and evidence sample counts.
  Levels come from existing mastery status; confidence is reported as an
  evidence tier rather than fabricated precision.
- Added persistent Light, Dark, and System theme choices. System is the default
  and responds to OS preference changes. Chinese remains the default language;
  all new visible copy is present in both existing i18n dictionaries.
- The reference layout was verified in the isolated local browser at 1600,
  1280, 1024, and 390 pixels. A 1024-pixel navigation gap found during QA was
  fixed by aligning the mobile-navigation cutoff with the 80rem desktop header
  breakpoint. No horizontal overflow or browser console warning/error remains.
- Final screenshot: `screenshots/dashboard-growth-os-light.jpg`. The existing
  `design-taste-frontend` Skill was used; no skill installation or global skill
  directory write was necessary.
- Fresh validation passes: 68 Vitest files / 697 tests, TypeScript, full ESLint
  with zero warnings, content quality with zero issues, content-index drift
  check, and production build. Vite reports only the existing non-blocking main
  chunk size advisory.
- Preserved boundaries: no Content Pack, Foundation/Concept/Case Schema,
  Training, Scoring, Mastery, Attempt, IndexedDB, protected personal/system
  data, Git stage/commit/reset, destructive command, or new server process.

## 2026-07-16 Capability Profile delivery checkpoint

- Redefined the existing `/profile` route as an evidence-backed AI Engineer
  Capability Profile. The page now contains Identity Summary, Engineering
  Readiness, Skill Evidence Map, Strengths and Growth Areas, Verified Evidence
  Timeline, and Completed Challenges.
- Extracted the Dashboard sample-weighted readiness, sampled mastery ordering,
  evidence confidence, completed-attempt ordering, and verdict tone into the
  pure `src/application/product/capability-evidence.ts` module. Dashboard JSX,
  layout, filters, and visible behavior remain unchanged.
- Profile reads only existing Skill Mastery, completed Attempt, Mistake, exact
  Case version, and Skill Definition records. It performs no repository writes,
  creates no mock capability evidence, and shows explicit empty states when
  trusted evidence is absent.
- Historical attempts remain keyed by stable IDs and exact case versions.
  Deprecated case history is retained; unavailable exact versions are warned
  about and excluded from evidence totals, timeline entries, and challenges.
  The timeline retains every trusted attempt while challenges deduplicate by
  stable case ID, preferring the highest score and then the newest tie.
- Strength requires sampled mastery at or above 60 and no critical mistake.
  Growth includes mastery below 60 or critical history, with critical risk
  taking precedence. Readiness stays unavailable when active skills have no
  sampled mastery rather than fabricating a zero.
- Added localized zh-CN/en-US Profile copy and scoped responsive CSS that uses
  the existing light/dark/system semantic tokens. The no-evidence readiness
  state uses `status`; only evidence-backed numeric readiness uses an ARIA
  `meter`.
- Fresh verification passes: 70 Vitest files / 708 tests, TypeScript, full
  ESLint with zero warnings, content quality (53 Cases, 50 Concepts, zero
  issues), content-index drift check, and production build. The build retains
  only the existing non-blocking main-chunk size advisory.
- Independent data and UI/accessibility reviews found no remaining Critical or
  Important issues after the ARIA empty-state fix and added regression tests.
- Preserved boundaries: no Dashboard layout, Content Pack, Foundation/Concept/
  Case Schema, Training, Scoring, Mastery algorithm, Attempt, IndexedDB, AI API,
  backend, database, dependency, service, protected personal/system data, Git
  stage/commit/reset, or destructive operation changes.

## 2026-07-17 Capability Map Showcase delivery checkpoint

- Added a pure Dashboard-local Capability Map provider that selects either
  prepared real signals or an explicitly labeled seven-node Demo Profile. Demo
  values never enter repositories, Mastery, Readiness, Mentor, Challenge,
  Evidence Timeline, Attempt, Progress, or IndexedDB.
- Demo appears only when every Mastery record has zero samples and no Attempt
  is completed. Any positive sample or any completed Attempt, including hidden
  or deprecated Case history, immediately selects real mode. A zero score with
  a positive sample is real evidence.
- The Demo Profile identifies Alex Chen, targets Production AI Engineer, and
  shows 72% Ready only inside the Capability Map. The real Readiness card and
  all other Dashboard modules continue to show the user's actual empty state.
- Real users without currently calculable active Mastery show `Start building
  capability proof` instead of a fabricated score. Unsampled nodes show `Not
  verified` and an action prompt without `No evidence` or `0 samples` database
  language.
- Capability Map presentation now uses four localized states: not verified,
  learning, competent, and proficient. Existing Weak Mastery is mapped to
  learning only in this visual layer; the Mastery algorithm is unchanged.
- Mobile review fixes keep the center state visible at widths up to 47.999rem
  and switch capability nodes to one column at widths up to 30rem. Existing
  semantic color and light/dark/system tokens remain the source of styling.
- Fresh verification passes: 71 Vitest files / 715 tests, TypeScript, full
  ESLint with zero warnings, content quality (53 Cases, 50 Concepts, zero
  issues), content-index drift check, production build, scoped Prettier, and
  `git diff --check`. The existing non-blocking main-chunk size advisory remains.
- Independent data-truthfulness and UI/accessibility reviews returned PASS
  after the two mobile findings were fixed with regression tests.
- Preserved boundaries: no Repository contract or write, Mastery algorithm,
  Attempt schema, Case/Training/Scoring flow, IndexedDB, AI API, backend,
  dependency, route, `/demo` page, service, protected personal/system data,
  Git stage/commit/reset, or destructive operation changes.

## 2026-07-17 Capability Constellation visual delivery checkpoint

- Refined only `CapabilityMapCard` presentation markup, its Phosphor icon
  mapping, scoped Capability Map CSS, and UI/CSS regression assertions. No
  Dashboard provider, capability signal, Demo value, Real evidence condition,
  Mastery, Repository, Attempt, Skill data, i18n, or persistence code changed.
- The map now uses seven centered visual nodes with semantic status rings,
  three orbit tracks, direction-aware connectors, and a dark AI Engineer core
  with restrained halo motion. Connector anchors were corrected for the new
  centered glyphs; the top connector starts after its copy so it cannot cross
  text.
- Demo provenance remains visibly labeled. Real evidence still has priority,
  and a real empty profile still presents the existing friendly verification
  prompt without a fabricated score, sample, or repository write.
- Desktop retains the constellation. At 47.999rem and below the map becomes a
  full-width core plus readable two-column node list; at 30rem it becomes one
  column and stacks the map header controls. Reduced motion and reduced
  transparency preferences have explicit fallbacks.
- The nested map `figcaption` was replaced by a styled `h2`; all three rings
  and decorative icons remain hidden from assistive technology, while status
  is expressed in text as well as color.
- Protected data/data-flow SHA-256 values are unchanged for
  `capability-map-data.ts`, its test, `DashboardPage.tsx`, and product-page
  i18n. Independent boundary and final UI/accessibility reviews report zero
  remaining Critical or Important findings after connector fixes.
- Fresh verification: focused UI regression 2 files / 30 tests; full Vitest 71
  files / 717 tests; TypeScript; ESLint with zero warnings; content quality (53
  Cases, 50 Concepts, zero issues); zero content-index drift; scoped Prettier;
  `git diff --check`; and production build. Vite retains only the existing
  non-blocking main-chunk-size advisory.
- No dependency install, service/watch process, browser session, Git stage,
  commit, reset, protected personal/system data access, or destructive command
  was used. Browser screenshot QA was deliberately not claimed because no
  service was started.

## 2026-07-17 Premium Capability Motion delivery checkpoint

- Added presentation-only motion to the existing Capability Map and Mentor Orb;
  no JSX, provider, signal, Demo/Real selection, Mastery, Attempt, Repository,
  evidence, i18n, token, or persistence code changed.
- Capability Map now enters in five restrained stages: atmosphere/orbits at
  0ms, core at 300ms, staggered nodes at 600ms, connectors at 900ms, and status
  ambience at 1200ms. The center breathes slowly, one dashed orbit rotates, and
  connector flow hands off without an opacity/transform jump.
- Mentor Orb now uses a slow core breath, 60s outer track, reverse 40s inner
  track, and continuous 34s particle orbit. Delayed animation base/first/end
  states were aligned after independent review so there are no activation or
  loop seams.
- All custom motion keyframes are restricted by regression tests to opacity and
  transform. Persistent `will-change` promotion and the visually ineffective
  solid-ring rotation were removed. Mobile keeps only one-shot entry motion;
  reduced-motion explicitly disables all related animations without removing
  structural transforms.
- Fresh verification passes: focused 3 files / 37 tests; full Vitest 71 files /
  719 tests; TypeScript; ESLint with zero warnings; scoped Prettier and
  `git diff --check`; content quality (53 Cases, 50 Concepts, zero issues);
  zero content-index drift; and production build. Vite retains only the
  pre-existing non-blocking main-chunk-size advisory.
- Protected Dashboard/data hashes remain unchanged. Independent boundary,
  motion, and test reviews report no remaining blocking finding.
- Files changed for this task: `src/styles/global.css`,
  `src/styles/shell.test.ts`, `docs/review-state.md`, and this checkpoint.
  No dependency install, service/watch process, browser session, screenshot,
  Git stage/commit/reset, protected personal/system access, or destructive
  operation was used.

## 2026-07-17 Knowledge Architecture V2 Phase 1 implementation checkpoint

- Current goal: implement the additive V2 sidecar foundation described by
  `docs/knowledge-architecture-v2.md` and
  `docs/knowledge-architecture-v2-phase1-plan.md`: a draft Leaf Skill Graph,
  Rubric contract, Practice contract, Case-to-Leaf Attribution prototype,
  validators, a read-only developer explorer, tests, and implementation notes.
- Working directory and project root are both
  `/Users/charles/Documents/FDE网页题库`. The existing dirty worktree is
  preserved; this task will not stage, commit, reset, delete, install
  dependencies, start a service, or alter files outside the project.
- Immutable boundaries: the 15 Legacy Skill definitions, Foundation and
  Concept IDs, Case IDs/versions, Content Pack v1, Attempt/Mistake/Progress/
  SkillMastery records, IndexedDB schema, Training, Scoring, Dashboard, and
  Capability Profile remain unchanged. V2 content lives in separate sidecar
  directories and is not loaded by production user pages.
- The draft catalog is intentionally partial: it demonstrates Levels 0–6 and
  all explicit edge kinds without pretending the future 70-Leaf catalog is
  frozen or published. Draft content may omit rubric pointers; published
  validation will enforce active Leaves, rubric references, and canonical
  Legacy presentation mappings.
- TDD baseline passed before implementation: `npm test -- --run` completed
  with 72 files and 725 tests. The first focused Skill Graph RED run failed as
  expected because the new schema and validator modules did not yet exist.
- Current work is split across isolated new-file scopes: Skill Graph core;
  Rubric/Practice/Attribution contracts; then CLI/artifact integration,
  documentation, scope audit, full verification, and independent review.
- Planned final gates: V2 validation/explorer checks, existing content
  validation, full Vitest, TypeScript, ESLint, and production build. No
  production dependency or long-running process is required.
- Absolute do-not-touch rules remain: no email, browser profiles, proxies,
  network/system configuration, credentials, real environment files, global
  configuration, or project-external personal data.

## 2026-07-17 Knowledge Architecture V2 Phase 1 delivery checkpoint

- Implemented the additive V2 sidecar without wiring it into production reads
  or writes: a seven-item Level 0–6 draft Leaf Skill sample Catalog, explicit
  graph edges, lifecycle-aware validators, one draft Rubric contract example,
  Practice and Case-to-Leaf Attribution contracts, generated JSON Schemas, and
  a read-only Skill Graph Explorer.
- Published validation is fail-closed: exactly 70 active Leaves, 15 unique
  Legacy Skills, the seven authoritative presentation nodes, canonical
  rollups/presentation mappings, acyclic prerequisites, and exact-version
  published Rubric coverage are required. Draft content remains reviewable
  without being represented as a finished 70-Skill release.
- V2 Catalog and Rubric releases are exact-version and atomic. Duplicate or
  ambiguous releases fail validation; partial Rubric Sets are never merged to
  manufacture complete coverage. Directory discovery accepts only
  `**/catalog.json`, while direct JSON paths remain available for focused
  validation.
- Practice remains a content contract only: exactly one Concept, one to three
  Foundations, one Leaf Skill, one scored action, deterministic answer/scoring
  contracts where required, and no authored user outcomes. Attribution remains
  a schema-only prototype with exact Case version/node, Leaf, Rubric, role,
  rationale, and reviewer references; no historical backfill exists.
- Added project-local commands: `knowledge:v2:validate`,
  `knowledge:v2:schemas`, `knowledge:v2:check`, and `skill-graph:explore`.
  Production build runs only the read-only V2 validation and Schema-drift
  gates; Content Pack v1 and generated Case indexes remain unchanged.
- Final verification: V2 focused regression 8 files / 111 tests; full Vitest 80
  files / 836 tests; existing content validation 53 Cases, 15 Domains, 15
  Legacy Skills, 100 Foundations, and 50 Concepts with zero issues; V2
  validation with 7 draft Leaves, 1 draft Rubric, zero Practices, zero
  Attributions, and zero issues; four generated Schemas in sync; TypeScript,
  ESLint with zero warnings, and production build all passed. Vite emitted only
  the pre-existing non-blocking main-chunk size advisory.
- A SHA-256 boundary audit found zero changes across 309 pre-existing protected
  files. Foundation/Concept/Case identities, Legacy Skills, Content Pack v1,
  Attempt/Mistake/Progress/Mastery, IndexedDB, Training, Scoring, Dashboard,
  and Capability Profile were not changed by this task.
- Final independent review findings were resolved with focused RED/GREEN
  regressions: Explorer now rejects duplicate/semantically invalid graphs
  before indexing; Rubric identities are unique by both Skill and Rubric ID;
  published Rubrics require an exact published Skill Catalog; each published
  Legacy Skill requires active Leaf coverage; and conflicting Attribution
  roles for the same Case node and Leaf fail closed.
- Downstream Rubrics are now available only when both the exact Skill Catalog
  and Rubric Catalog are published. Rubric identity uniqueness is deliberately
  scoped to an exact Skill Catalog release, allowing an unchanged Rubric
  ID/version to be reused by a later Catalog release without artificial
  version inflation; same-release duplicates remain invalid.
- No dependency install, service/watch process, browser session, Git stage,
  commit, reset, protected personal/system data access, or destructive command
  was used. Phase 1B remains a separate 5–10 Case Attribution Pilot and must
  stay shadow-only until reviewed.
# Beta Finalization Sprint — 2026-07-18

- Goal: close the local-first Beta loop, then freeze for user validation.
- Decisions: versioned localStorage sidecars for Practice completion, Project
  milestones, and feedback; fail-closed validation; static isolated Demo data.
- Changed in this sprint: Practice persistence/provider, Project milestone UI,
  Feedback page/route/navigation, Demo Capability Map/Journey, Dashboard Start
  Journey CTA, release/design documentation, and focused tests.
- Do not touch: stable Foundation/Concept/Case IDs, Legacy Skill, Attempt schema,
  Mastery algorithm, existing IndexedDB architecture, or Dashboard structure.
- Verification: TypeScript passed; ESLint passed; Vitest 85 files / 852 tests
  passed; production Build passed; V2 validation passed; schema drift passed;
  content quality and generated content index drift passed.
- Pending: final release report only. Product development is frozen after handoff.
- Risks: localStorage is browser/device scoped; feedback must be collected
  manually; storage quota failures fall back to the current session.
