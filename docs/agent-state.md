# Agent State

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
