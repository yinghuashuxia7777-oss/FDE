# Foundation Knowledge Layer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use
> superpowers:subagent-driven-development (recommended) or
> superpowers:executing-plans to implement this plan task-by-task. Steps use
> checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add 30 validated beginner Foundation knowledge items, evidence-based
progress, Foundation pages, and a pre-training prerequisite gate while keeping
all approved Case, Content Pack, Training, Mastery, Attempt, and IndexedDB
contracts unchanged.

**Architecture:** Foundation is a separately indexed bundled content layer
loaded through `FoundationSource`. It joins existing stable Skill and Case IDs
at validation and read time. Progress is a pure projection over existing Skill
Mastery and immutable Attempt history, and a new Attempt is created only after the learner
passes the route-level prerequisite gate.

**Tech Stack:** React 19.2.7, TypeScript 6.0.3, React Router 7.18.1, Zod
4.4.3, Vitest 4.1.10, Testing Library, existing CSS/i18n/content tooling.

## Global Constraints

- Do not modify `ContentPack`, `ContentManifest`, their checksum, or the
  ContentInstaller transaction.
- Do not modify FDE Case Schema or any Case JSON.
- Do not modify the Training Engine, Scoring, Mastery update algorithm,
  Attempt records, IndexedDB schema, stores, repositories, or migrations.
- Do not add dependencies, a service, a backend, an account system, cloud
  sync, CMS, online editing, or AI-generated content.
- Reuse existing stable Skill and active Case IDs; never join by title or file
  path.
- Preserve every pre-existing dirty-worktree change. Do not stage, commit,
  reset, delete, or reinitialize the repository.
- Every behavior change follows a focused RED→GREEN Vitest cycle.
- Full-suite tests and full production build are handed to the user as one
  manual Terminal command under the machine safety rules.

---

## File structure

### New production files

- `src/domain/foundation/types.ts`: Foundation content and status contracts.
- `src/content/foundation-schema.ts`: strict Zod authoring/runtime schema.
- `src/content/foundation-source.ts`: `FoundationSource` and cached bundled
  `LocalFoundationSource`.
- `src/generated/foundation-index.ts`: deterministic generated lazy loader map.
- `src/application/foundation/analysis.ts`: pure progress, track summary,
  prerequisite, and next-item selectors.
- `src/application/foundation/index.ts`: public Foundation application exports.
- `src/pages/foundation/FoundationLibraryPage.tsx`: Foundation overview.
- `src/pages/foundation/FoundationDetailPage.tsx`: ordered knowledge detail.
- `src/pages/foundation/index.ts`: page exports.
- `src/pages/training/PrerequisiteKnowledgeGate.tsx`: read-only start gate.
- `src/i18n/translations/foundation-pages.ts`: complete zh-CN/en-US UI chrome.
- `content/foundation/<module>/*.json`: 30 authored items.
- `content/schemas/foundation.schema.json`: generated authoring Schema.

### Existing production files changed

- `scripts/files.ts`: discover Foundation JSON with the complete content
  snapshot.
- `scripts/validate-content.ts`: schema/reference/directory/duplicate checks.
- `scripts/build-case-index.ts`: generate/check the Foundation Schema and index
  without changing Content Pack artifacts.
- `src/app/router.tsx`: `/foundation` and `/foundation/:foundationId`.
- `src/components/layout/ApplicationShell.tsx`: desktop Foundation destination.
- `src/components/layout/MobileNavigation.tsx`: Foundation in More drawer.
- `src/pages/dashboard/DashboardPage.tsx`: three-track progress and next item.
- `src/pages/training/TrainingRoutePage.tsx`: defer new Attempt until gate CTA.
- `src/i18n/zh-CN.ts`, `src/i18n/en-US.ts`: merge new dictionaries.
- `src/styles/global.css`: Foundation cards, reading column, progress, and gate.
- `docs/agent-state.md`: final checkpoint and safety/verification status.

### Tests changed or added

- `src/content/foundation-schema.test.ts`
- `src/content/foundation-source.test.ts`
- `src/application/foundation/analysis.test.ts`
- `scripts/validate-content.test.ts`
- `scripts/build-case-index.test.ts`
- `src/pages/foundation/FoundationPages.test.tsx`
- `src/pages/product-pages.test.tsx`
- `src/pages/training/TrainingRoutePage.test.tsx`
- `src/app/App.test.tsx`
- `src/content/foundation-training-flow.integration.test.tsx`
- existing i18n coverage tests automatically scan all new production TSX.

---

### Task 1: Foundation contract, Schema, and source

**Files:**

- Create: `src/domain/foundation/types.ts`
- Create: `src/content/foundation-schema.ts`
- Create: `src/content/foundation-schema.test.ts`
- Create: `src/content/foundation-source.ts`
- Create: `src/content/foundation-source.test.ts`
- Initially create: `src/generated/foundation-index.ts`

**Interfaces:**

- Produces:
  `FoundationKnowledge`, `FoundationTrack`, `FoundationLearningStatus`,
  `FoundationKnowledgeSchema`, `FoundationSource`, `LocalFoundationSource`,
  and `bundledFoundationSource`.
- Consumes no Content Pack or repository contracts.

- [ ] **Step 1: Write the failing Schema tests**

  Assert that the wished-for Schema accepts one complete item and rejects a
  missing explanation, duplicate Skill/Case IDs, executable text, invalid ID,
  non-positive order, and non-positive estimated minutes.

- [ ] **Step 2: Verify RED**

  Run:

  ```bash
  npm test -- --run src/content/foundation-schema.test.ts
  ```

  Expected: FAIL because the Foundation contract and Schema do not exist.

- [ ] **Step 3: Implement the strict contract and Schema**

  Use `schemaVersion: 1`, `type: 'foundation'`, the three exact MVP tracks,
  safe non-empty authored text, unique non-empty `skills` and `relatedCases`,
  and bounded integer `order`/`estimatedMinutes`.

- [ ] **Step 4: Verify Schema GREEN**

  Run the same focused test. Expected: PASS.

- [ ] **Step 5: Write failing source tests**

  Inject a test index into `LocalFoundationSource` and assert deterministic
  authored order, runtime parsing, promise caching, a frozen snapshot, and a
  safe `findById` result.

- [ ] **Step 6: Verify source RED**

  ```bash
  npm test -- --run src/content/foundation-source.test.ts
  ```

  Expected: FAIL because the source API does not exist.

- [ ] **Step 7: Implement the minimal local source**

  `FoundationSource` exposes `loadAll()` and `findById(id)`. The local source
  consumes only a lazy index, parses every loaded JSON value, sorts by
  `order || id`, deep-freezes the result, and caches one Promise.

- [ ] **Step 8: Verify source GREEN**

  Run both focused files and expect all tests to pass.

---

### Task 2: Validation and deterministic Foundation artifacts

**Files:**

- Modify: `scripts/files.ts`
- Modify: `scripts/validate-content.ts`
- Modify: `scripts/validate-content.test.ts`
- Modify: `scripts/build-case-index.ts`
- Modify: `scripts/build-case-index.test.ts`
- Generate: `src/generated/foundation-index.ts`
- Generate: `content/schemas/foundation.schema.json`

**Interfaces:**

- Consumes `FoundationKnowledgeSchema` and existing validated Skill/Case data.
- Produces `ValidatedFoundationSource`, Foundation issues in complete content
  validation, `generateFoundationIndex()`, and two generated artifacts included
  in drift checks.

- [ ] **Step 1: Write failing complete-validation tests**

  Add a complete valid Foundation item and assert zero issues. Then assert
  `duplicate_foundation_id`, `missing_skill_reference`,
  `inactive_skill_reference`, `missing_active_case_reference`, and
  `foundation_domain_path_mismatch` for exact invalid snapshots.

- [ ] **Step 2: Verify validation RED**

  ```bash
  npm test -- --run scripts/validate-content.test.ts
  ```

  Expected: the new Foundation expectations fail.

- [ ] **Step 3: Implement complete validation**

  `readContentBundleSources()` recursively reads `content/foundation`.
  Validation parses Foundation independently, joins Skill IDs to active
  definitions, joins related Case IDs to `ContentConfig.activeCases`, compares
  `domain` with the directory immediately below `content/foundation`, and adds
  deterministic sorted issues. Do not pass Foundation into
  `ContentPackSchema`.

- [ ] **Step 4: Verify validation GREEN**

  Re-run the focused validation file and expect PASS.

- [ ] **Step 5: Write failing artifact tests**

  Assert deterministic index ordering/import paths, the generated Foundation
  JSON Schema path, inclusion in `findContentArtifactDrift`, and no changes to
  the generated Content Manifest/checksum input.

- [ ] **Step 6: Verify artifact RED**

  ```bash
  npm test -- --run scripts/build-case-index.test.ts
  ```

- [ ] **Step 7: Implement Foundation artifact generation**

  Generate an index containing stable metadata plus lazy imports. Add only
  `src/generated/foundation-index.ts` and
  `content/schemas/foundation.schema.json` to artifact files. Leave the
  manifest object and checksum input byte-for-byte governed by Cases,
  Domains, Skills, and Coverage.

- [ ] **Step 8: Verify artifact GREEN and bounded CLI behavior**

  Run the two focused test files, then:

  ```bash
  npm run content:validate -- --dry-run --limit 10
  npm run content:index -- --dry-run --limit 10
  ```

  Expected: both bounded commands exit 0 and do not write files.

---

### Task 3: Author the 30-item Foundation MVP

**Files:**

- Create 10 JSON files under `content/foundation/computer-basics/`.
- Create 7 JSON files under `content/foundation/network/`.
- Create 3 JSON files under `content/foundation/api/`.
- Create 7 JSON files under `content/foundation/ai-basics/`.
- Create 1 JSON file under `content/foundation/rag/`.
- Create 2 JSON files under `content/foundation/agent/`.
- Create `.gitkeep` under the currently empty requested module directories:
  `programming`, `linux`, `docker`, `cloud`, `database`, `fine-tuning`, and
  `fde-methodology`.

**Interfaces:**

- Every JSON file satisfies `FoundationKnowledgeSchema`.
- Every `skills[]` entry is one of the current 15 active Skill IDs.
- Every `relatedCases[]` entry is one of the current 24 active Case IDs.

- [ ] **Step 1: Add a failing corpus test**

  Assert exactly 30 valid items, unique IDs/orders, track counts 10/10/10,
  every authored section at meaningful length, every item linked to a Skill
  and active Case, and representative IDs for API, HTTP, RAG, and Agent.

- [ ] **Step 2: Verify corpus RED**

  Run the corpus-focused test. Expected: FAIL with zero/missing items.

- [ ] **Step 3: Author computer basics 1–10**

  Cover software/program, frontend/backend, service, data, database, API,
  server, request/response, logs, and configuration/environment. Use causal
  examples from existing beginner Cases rather than dictionary definitions.

- [ ] **Step 4: Author network/API 11–20**

  Cover IP, DNS, port, TCP, HTTP request, HTTP status, HTTPS/TLS, API tokens,
  timeout/retry, and webhook idempotency.

- [ ] **Step 5: Author AI basics 21–30**

  Cover LLM, token, context window, prompt, embedding, vector database, RAG,
  Agent, tool calling, and evaluation/guardrails.

- [ ] **Step 6: Verify corpus GREEN**

  Run the corpus, Schema, and complete-validation focused tests. Expected:
  30 valid items and zero Foundation issues.

- [ ] **Step 7: Generate only the bounded Foundation artifacts**

  Run the project generator with its Foundation-only bounded adapter or emit
  the deterministic outputs through the tested generator using
  `--input content/foundation --limit 30`. Confirm only the Foundation index
  and Foundation Schema change; never rewrite the Content Pack manifest.

---

### Task 4: Pure progress and prerequisite analysis

**Files:**

- Create: `src/application/foundation/analysis.ts`
- Create: `src/application/foundation/analysis.test.ts`
- Create: `src/application/foundation/index.ts`

**Interfaces:**

- Produces:

  ```ts
  foundationStatus(item, mastery, attempts): FoundationLearningStatus
  buildFoundationTrackProgress(items, mastery, attempts): FoundationTrackProgress[]
  selectNextFoundation(items, mastery, attempts): FoundationKnowledge | undefined
  prerequisitesForCase(items, caseId, mastery, attempts): FoundationItemProgress[]
  ```

- [ ] **Step 1: Write failing pure-function tests**

  Cover not-started, learning through Skill samples, learning through any
  related Attempt, mastered only when all Skills are `>=60` with samples and a
  completed related Attempt has `pass`/`excellent`, historical pass followed by
  a failed retry, no false mastery from missing records, exact
  10/10/10 aggregation, deterministic next-item order, and prerequisites sorted
  learning → not-started → mastered.

- [ ] **Step 2: Verify RED**

  ```bash
  npm test -- --run src/application/foundation/analysis.test.ts
  ```

- [ ] **Step 3: Implement minimal pure selectors**

  Use stable ID Maps and Sets only. Never call a repository or write a Mastery
  record. Treat only completed `pass` and `excellent` Attempts as applied Case
  evidence; never infer a pass from highest score or latest Progress.

- [ ] **Step 4: Verify GREEN**

  Re-run the focused test and expect PASS.

---

### Task 5: Foundation Dashboard, pages, routes, navigation, and i18n

**Files:**

- Create: `src/pages/foundation/FoundationLibraryPage.tsx`
- Create: `src/pages/foundation/FoundationDetailPage.tsx`
- Create: `src/pages/foundation/FoundationPages.test.tsx`
- Create: `src/pages/foundation/index.ts`
- Create: `src/i18n/translations/foundation-pages.ts`
- Modify: `src/pages/dashboard/DashboardPage.tsx`
- Modify: `src/pages/product-pages.test.tsx`
- Modify: `src/app/router.tsx`
- Modify: `src/app/App.test.tsx`
- Modify: `src/components/layout/ApplicationShell.tsx`
- Modify: `src/components/layout/MobileNavigation.tsx`
- Modify: `src/i18n/zh-CN.ts`
- Modify: `src/i18n/en-US.ts`
- Modify: `src/styles/global.css`

**Interfaces:**

- Pages consume `FoundationSource`, existing `ProductRepositories`, and Task 4
  selectors.
- Routes are exactly `/foundation` and `/foundation/:foundationId`.

- [ ] **Step 1: Write failing page tests**

  Assert dynamic 10/10/10 groups, derived progress, stable detail links,
  continue-learning fallback, explicit detail section order, human-readable
  Skill labels and Mastery, active related Cases only, stable training links,
  not-found behavior, and translated UI chrome with authored content unchanged.

- [ ] **Step 2: Verify page RED**

  ```bash
  npm test -- --run src/pages/foundation/FoundationPages.test.tsx src/pages/product-pages.test.tsx
  ```

- [ ] **Step 3: Implement pages and Dashboard panel**

  Reuse `PageHeader`, `AsyncPage`, `StatusBadge`, `panel`, `metric-strip`, and
  `case-grid`. Render authored detail fields explicitly; do not iterate object
  values or use HTML injection. The Dashboard Foundation panel follows Today's
  Training so the daily action remains first.

- [ ] **Step 4: Verify page GREEN**

  Re-run the two focused files and expect PASS.

- [ ] **Step 5: Write failing route/navigation tests**

  Assert both routes use `ApplicationShell`, desktop Foundation active state,
  Foundation in the mobile More drawer, accessible drawer navigation, and page
  title focus after navigation.

- [ ] **Step 6: Verify route RED**

  ```bash
  npm test -- --run src/app/App.test.tsx
  ```

- [ ] **Step 7: Implement routes, navigation, translations, and CSS**

  Add one desktop destination and one More-drawer destination. Merge equal
  zh-CN/en-US keys. Use one responsive Foundation card grid, native progress
  elements with visible counts, a `70ch` reading column, `min-width: 0`, and the
  existing 48rem/64rem breakpoints.

- [ ] **Step 8: Verify route/i18n GREEN**

  Run App tests and `src/i18n/coverage.test.ts`. Expected: no missing keys, no
  Chinese UI literals in TSX, and no new shell regression.

---

### Task 6: Pre-training prerequisite gate

**Files:**

- Create: `src/pages/training/PrerequisiteKnowledgeGate.tsx`
- Modify: `src/pages/training/TrainingRoutePage.tsx`
- Modify: `src/pages/training/TrainingRoutePage.test.tsx`
- Modify: `src/i18n/translations/foundation-pages.ts`

**Interfaces:**

- Consumes `FoundationSource`, `prerequisitesForCase()`, and the existing
  `createTrainingSession()`/`resumeAttempt()` APIs unchanged.
- Produces no new record type or repository write path.

- [ ] **Step 1: Write failing zero-write gate tests**

  For a new Case with prerequisites, assert the gate is visible and
  `attemptRepository.save` has zero calls. Clicking a Foundation link must keep
  writes at zero. Clicking direct start must save exactly once and render the
  first training node. A disabled pending button must prevent double creation.

- [ ] **Step 2: Verify RED**

  ```bash
  npm test -- --run src/pages/training/TrainingRoutePage.test.tsx
  ```

- [ ] **Step 3: Implement the route orchestration**

  Split route resolution from new-session creation. Resume a matching exact
  version immediately. For a new session, load prerequisites fail-open, render
  the gate if non-empty, and call `createTrainingSession()` only from the
  guarded CTA. Preserve current immediate behavior when no prerequisites exist.

- [ ] **Step 4: Verify GREEN and regression cases**

  Re-run the focused file. Confirm inactive Case, missing exact version,
  persistence retry, exact-version resume, no-prerequisite Case, Foundation
  load failure, and double-click behavior all pass.

---

### Task 7: Real bundled integration and bounded delivery verification

**Files:**

- Create: `src/content/foundation-training-flow.integration.test.tsx`
- Modify: `docs/agent-state.md`

**Interfaces:**

- Uses the real 30-item generated Foundation index, the real bundled Case
  catalog, fake IndexedDB repositories, unchanged training service, and real
  Debrief rendering.

- [ ] **Step 1: Write the failing integration test**

  Select `api-basic`, verify its existing Skill and active Case references,
  confirm no Attempt exists while viewing Foundation/prerequisites, start the
  related Case, complete its authored correct path, assert the unchanged
  Attempt/Progress/Mastery snapshot, and render Debrief for the exact version.

- [ ] **Step 2: Verify RED, then make only boundary fixes**

  ```bash
  npm test -- --run src/content/foundation-training-flow.integration.test.tsx
  ```

  Expected initial RED must identify a missing integration boundary, not a
  typo. Fix only that boundary; do not change Training/Scoring/Mastery storage.

- [ ] **Step 3: Verify the focused delivery matrix**

  ```bash
  npm test -- --run src/content/foundation-schema.test.ts src/content/foundation-source.test.ts src/application/foundation/analysis.test.ts scripts/validate-content.test.ts scripts/build-case-index.test.ts src/pages/foundation/FoundationPages.test.tsx src/pages/product-pages.test.tsx src/pages/training/TrainingRoutePage.test.tsx src/app/App.test.tsx src/i18n/coverage.test.ts src/content/foundation-training-flow.integration.test.tsx
  npm run content:validate -- --dry-run --limit 10
  npm run content:index -- --dry-run --limit 10
  npm run typecheck
  npm run lint
  npm run format:check
  git diff --check
  ```

  Expected: every focused test and bounded check exits 0. If any command is
  likely to exceed two minutes on the current machine, stop and hand it to the
  user instead of running it.

- [ ] **Step 4: Update `docs/agent-state.md`**

  Record the feature goal, exact decisions, files changed, RED/GREEN commands,
  results, known limits, manual full-verification command, and absolute
  do-not-touch rules. Do not store personal data or secrets.

- [ ] **Step 5: Provide the user-owned full verification command**

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

  The user runs this command manually in Terminal. Codex reports the full test
  and build status only after receiving that output.
