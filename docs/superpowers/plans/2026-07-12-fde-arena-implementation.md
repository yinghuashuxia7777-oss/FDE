# FDE Arena Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development to implement this plan task-by-task. Steps use checkbox syntax for tracking.

**Goal:** Build the complete local-first FDE Arena MVP specified in `docs/product-spec.md`.

**Architecture:** Versioned JSON content is validated and indexed before Vite builds it. React pages call application services backed by pure domain functions and IndexedDB repository adapters; no page touches storage directly.

**Tech Stack:** React, TypeScript strict mode, Vite, React Router HashRouter, IndexedDB/idb, Zod, Vitest, React Testing Library, Playwright, ESLint, Prettier, native CSS variables.

## Global Constraints

- Work only inside `/Users/charles/Documents/FDE网页题库`.
- Do not access secrets, real `.env` files, browser profiles, email, proxy, network, or global configuration.
- Add no production dependency without explicit approval.
- All dependencies are saved exactly and locked by `package-lock.json`.
- No server, watch mode, or command expected to exceed two minutes is started by Codex.
- All production behavior follows a verified RED-GREEN-REFACTOR cycle.
- All visible content and runtime assets are local; answering requires no API.

---

### Task 1: Toolchain and executable skeleton

**Files:** `package.json`, `package-lock.json`, `index.html`, `vite.config.ts`, `tsconfig*.json`, `eslint.config.js`, `.prettierrc.json`, `.gitignore`, `src/main.tsx`, `src/app/App.tsx`, `src/styles/*.css`, `.github/workflows/ci.yml`

**Produces:** `npm run dev`, `test`, `typecheck`, `lint`, and `build` scripts; strict TypeScript; HashRouter shell; tokenized light/dark/system theme.

- [ ] Confirm the exact production and development dependency set with the user.
- [ ] Install with `npm install --save-exact` and preserve the generated lockfile.
- [ ] Write a smoke test for the application landmark and run it to observe the missing app failure.
- [ ] Add the minimum router, providers, shell, reset, and token CSS required to pass.
- [ ] Run the focused smoke test, `npm run typecheck`, `npm run lint`, and `npm run build`.

### Task 2: Discriminated content schema and fixtures

**Files:** `src/domain/cases/types.ts`, `src/schemas/case.schema.ts`, `src/schemas/export.schema.ts`, `content/schemas/fde-case.schema.json`, `src/tests/fixtures/cases.ts`, related unit tests

**Produces:** `FdeCaseSchema`, discriminated `CaseNodeSchema`, `NodeSubmission`, `EvaluationResult`, and JSON Schema generation.

- [ ] Write failing tests for all five answer shapes, shared metadata, invalid option references, and import envelopes.
- [ ] Implement the smallest Zod discriminated union that passes the shape tests.
- [ ] Generate JSON Schema from Zod and add a drift test that compares the checked-in artifact.
- [ ] Run schema tests and typecheck.

### Task 3: Evaluation, scoring, branching and mastery

**Files:** `src/domain/scoring/*`, `src/domain/mastery/*`, `src/domain/cases/graph.ts`, related unit tests

**Produces:** `evaluateNode`, `scoreCase`, `getVerdict`, `resolveNextNode`, `updateMastery`.

- [ ] Add one failing behavior test at a time for choice rounds, multi-select penalties, ordering similarity, matching, evidence-conclusion, critical errors, verdict thresholds, branch resolution, and mastery caps.
- [ ] Run each focused test and confirm it fails for the missing behavior.
- [ ] Implement the minimum pure function for each behavior and rerun focused plus domain tests.
- [ ] Add property-style boundary cases for zero weights, duplicate submissions, and malformed graphs.

### Task 4: Content validation, graph audit and generated index

**Files:** `scripts/cli.ts`, `scripts/validate-content.ts`, `scripts/validate-graph.ts`, `scripts/detect-duplicate-ids.ts`, `scripts/audit-coverage.ts`, `scripts/build-case-index.ts`, script tests, `src/generated/case-index.ts`

**Produces:** bounded CLIs with `--dry-run`, `--limit`, `--input`, `--output`, and `--skip-existing`; reproducible validation and index generation.

- [ ] Write failing script-level tests using valid, duplicate, unreachable, cyclic, deprecated, and incomplete fixtures.
- [ ] Implement argument parsing and one validator at a time.
- [ ] Confirm `npm run content:validate -- --limit 1` and `npm run content:audit -- --limit 10` produce deterministic reports.
- [ ] Generate the application case index only after every content check passes.

### Task 5: IndexedDB repositories and versioned bootstrap

**Files:** `src/repositories/contracts/*`, `src/repositories/indexeddb/*`, `src/storage/database.ts`, `src/storage/migrations.ts`, `src/storage/seed.ts`, repository tests

**Produces:** all seven repository contracts, immutable case versions, transactional progress data, and idempotent seed.

- [ ] Write failing contract tests against the IndexedDB adapters for create/read/list, indexes, rollback, version preservation, and clear-progress boundaries.
- [ ] Implement schema version 1 and adapters without leaking database handles to pages.
- [ ] Add bootstrap tests for first seed, repeat seed, and new case version.
- [ ] Run repository tests and typecheck.

### Task 6: Training session application service

**Files:** `src/application/training/*`, reducer and service tests

**Produces:** `createTrainingSession`, `trainingReducer`, `submitNode`, `resumeAttempt`, and `completeAttempt`.

- [ ] Write failing reducer tests for loading, wrong rounds, progressive hints, reveal, advancement, resume, consequences, terminal completion, and persistence failure.
- [ ] Implement the explicit five-state reducer and persistence service.
- [ ] Verify every saved attempt contains case version and complete round history.

### Task 7: Responsive shell and shared UI

**Files:** `src/app/router.tsx`, `src/components/layout/*`, `src/components/ui/*`, `src/components/evidence/*`, component tests

**Produces:** adaptive sidebar/drawer/bottom navigation, skip link, focus management, theme, code/log/diff renderers, loading/empty/error states.

- [ ] Write semantic component tests for navigation, focus, theme, evidence labels, horizontal evidence scrolling, and mobile disclosure.
- [ ] Implement native accessible components with 44 px targets and token CSS.
- [ ] Test light, dark, system, reduced-motion, and 200% text behavior.

### Task 8: Training renderers and adaptive feedback

**Files:** `src/components/question/*`, `src/components/case/*`, `src/components/scoring/*`, `src/pages/training/*`, component tests

**Produces:** all required question renderers, desktop three-column training, mobile ordered disclosure, progressive hints, consequence meter, and progress.

- [ ] Add failing tests per renderer using role/label queries, including keyboard alternatives for ordering and matching.
- [ ] Implement choice-family renderers first, then multiple choice, ordering, matching, and evidence-conclusion.
- [ ] Integrate session submission and verify the answer is not revealed before the third wrong round.

### Task 9: Product pages and data workflows

**Files:** `src/pages/dashboard/*`, `cases/*`, `debrief/*`, `mistakes/*`, `skills/*`, `profile/*`, `settings/*`, application services, page tests

**Produces:** eight required product areas, URL-restored filters, recommendations, mistake history, ability summaries, versioned export/import, and confirmed clear.

- [ ] Write one failing user-flow component test for each page before implementing it.
- [ ] Build pages on repository/application interfaces, never database APIs.
- [ ] Add failure-path tests for empty data, corrupt import, storage failure, and missing case versions.

### Task 10: Twenty-four reviewed MVP cases

**Files:** `content/cases/beginner/*.json`, `intermediate/*.json`, `advanced/*.json`, `content/reviews/*.json`

**Produces:** 12 beginner, 8 intermediate, and 4 advanced cases; each has at least four decision nodes, evidence, priority, repair/verification, explanations, tags, time, and reviewer record.

- [ ] Author cases in three non-overlapping difficulty batches against the frozen schema.
- [ ] Run schema and graph validation after each individual case.
- [ ] Use an independent evaluator pass to reject ambiguity, unverifiable claims, weak distractors, and missing evidence.
- [ ] Ensure at least five of the twelve intermediate/advanced cases span three or more domains.

### Task 11: 338-case registry and coverage report

**Files:** `content/coverage/case-backlog.json`, `content/coverage/registry.json`, `docs/coverage-matrix.md`, `docs/content-guidelines.md`, generated audit report

**Produces:** exactly 338 unique planned/core records with the domain counts specified in the product spec, while the 24 implemented cases are marked published.

- [ ] Add failing count, uniqueness, required-field, domain-distribution, and published-file existence tests.
- [ ] Build the registry in bounded domain batches and validate each batch.
- [ ] Generate the human-readable matrix and gap report from registry data.

### Task 12: End-to-end acceptance and delivery

**Files:** `tests/e2e/*.spec.ts`, `playwright.config.ts`, `README.md`, `docs/import-export.md`, `docs/deployment.md`, `docs/test-report.md`, `docs/remaining-work.md`, updated `docs/agent-state.md`

**Produces:** the complete specified journey, reproducible local instructions, static deployment guidance, and an evidence-backed completion report.

- [ ] Write the failing end-to-end journey for wrong hint, correct retry, completion, debrief, mistake notebook, refresh, export, clear, and import restore.
- [ ] Run focused E2E if browser binaries are already present; otherwise provide the exact approved installation and manual-run commands.
- [ ] Run content validation, unit/component tests, typecheck, lint, and build separately, recording command output.
- [ ] Inspect the final diff, check every acceptance criterion, and report any remaining item honestly.

