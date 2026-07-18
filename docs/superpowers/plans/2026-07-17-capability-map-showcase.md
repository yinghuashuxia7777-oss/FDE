# Capability Map Showcase Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an explicitly labeled Demo Capability Map for users with no real capability evidence while preserving real-data priority and every core learning contract.

**Architecture:** A pure Dashboard-local provider selects either real or Demo `CapabilitySignal[]` from already-loaded records. The provider has no repository dependency; `CapabilityMapCard` only renders prepared signals and presentation labels. Demo readiness is isolated to the Map center and never enters real readiness, mastery, mentor, or evidence calculations.

**Tech Stack:** React 19, TypeScript, existing repository interfaces, existing i18n, native CSS tokens, Phosphor icons, Vitest, Testing Library.

## Global Constraints

- Do not modify the Mastery algorithm, Attempt schema, repositories, IndexedDB, Case, Training, or Scoring.
- Do not write Demo data, seed a fake user, or expose Demo values as real evidence.
- Use all original Attempt and Mastery records for mode selection.
- Real evidence always wins over Demo.
- Demo affects only Capability Map signals, badge, source, and center value.
- All visible copy must exist in zh-CN and en-US.
- Add no dependency, backend, service, route, or `/demo` page.
- Do not run Git stage, commit, reset, or destructive commands.

---

### Task 1: Pure Capability Map provider

**Files:**

- Create: `src/pages/dashboard/capability-map-data.test.ts`
- Create: `src/pages/dashboard/capability-map-data.ts`
- Modify: `src/pages/dashboard/DashboardVisuals.tsx`

**Interfaces:**

- Produces `hasRealCapabilityEvidence(mastery, attempts): boolean`.
- Produces `buildRealCapabilitySignals(t, definitions, mastery): CapabilitySignal[]`.
- Produces `buildDemoCapabilitySignals(t): CapabilitySignal[]`.
- Produces `provideCapabilityMapData(input): CapabilityMapData` with mode, readiness, Demo metadata, and seven signals.
- Moves `CapabilitySignal` ownership to the provider module; the visual component imports the type.

- [x] **Step 1: Write failing mode-selection tests**

Cover empty data, zero-sample records, in-progress Attempts, a zero-score positive sample, and a completed historical Attempt. Assert that real mode never contains Demo scores.

- [x] **Step 2: Run the RED provider test**

Run: `npm test -- --run src/pages/dashboard/capability-map-data.test.ts`

Expected: fail because `capability-map-data.ts` does not exist.

- [x] **Step 3: Implement the minimal provider and signal types**

Use the exact gate:

```ts
export function hasRealCapabilityEvidence(
  mastery: readonly SkillMasteryRecord[],
  attempts: readonly AttemptRecord[],
): boolean {
  return (
    mastery.some(({ sampleCount }) => sampleCount > 0) ||
    attempts.some(({ status }) => status === 'completed')
  );
}
```

Keep the seven Demo signals as a module-local readonly constant with stable Skill IDs. Do not import repositories.

- [x] **Step 4: Run the GREEN provider test**

Run: `npm test -- --run src/pages/dashboard/capability-map-data.test.ts`

Expected: all provider cases pass.

---

### Task 2: Dashboard integration and honest UI states

**Files:**

- Modify: `src/pages/product-pages.test.tsx`
- Modify: `src/pages/dashboard/DashboardPage.tsx`
- Modify: `src/pages/dashboard/DashboardVisuals.tsx`

**Interfaces:**

- `DashboardPage` passes original `attempts` and `mastery` to the provider before visible-case filtering.
- `CapabilityMapCard` accepts optional `badgeLabel` plus prepared signals; it never receives `mode` or repositories.
- Real `ReadinessCard`, Mentor, Challenge, and Evidence Timeline keep their current inputs.

- [x] **Step 1: Write failing Dashboard behavior tests**

Assert:

```text
new learner -> Demo Profile + 72% Ready + seven nodes
new learner -> real Readiness still insufficient and Evidence Timeline still empty
score 0 with one sample -> no Demo + real 0%
completed Attempt without Mastery -> no Demo + Start building capability proof
```

Expand the no-write assertion to every repository mutator in the existing test double.

- [x] **Step 2: Run the RED Dashboard tests**

Run: `npm test -- --run src/pages/product-pages.test.tsx`

Expected: fail on missing Demo badge, mode selection, and new empty-state copy.

- [x] **Step 3: Integrate the provider without changing other Dashboard data flows**

Select Map data after real readiness is calculated. Use Demo readiness only for `CapabilityMapCard.coreEvidence`; continue passing real readiness everywhere else.

- [x] **Step 4: Simplify node rendering to prepared status and evidence labels**

Render `Level N + state` for sampled signals and the two-line verified prompt for unsampled signals. Do not render confidence or a zero sample count for `not-started`.

- [x] **Step 5: Run the GREEN Dashboard tests**

Run: `npm test -- --run src/pages/product-pages.test.tsx src/pages/dashboard/capability-map-data.test.ts`

Expected: all tests pass and existing 67% real evidence behavior remains intact.

---

### Task 3: Localization and visual-state styling

**Files:**

- Modify: `src/i18n/translations/product-pages.ts`
- Modify: `src/styles/shell.test.ts`
- Modify: `src/styles/global.css`

**Interfaces:**

- Adds static keys for Demo badge/source, honest real empty center, four status labels, not-verified prompt, and singular/plural evidence nouns.
- Uses existing warning, accent, success, muted, surface, border, radius, and dark-mode tokens.

- [x] **Step 1: Write failing i18n and CSS contracts**

Assert Demo badge styling uses semantic accent/radius tokens, `not-started` no longer relies on whole-node opacity, and learning/competent/proficient use warning/accent/success tokens.

- [x] **Step 2: Run RED contracts**

Run: `npm test -- --run src/i18n/coverage.test.ts src/styles/shell.test.ts`

Expected: fail until new keys and selectors exist.

- [x] **Step 3: Add localized copy and scoped CSS**

Retain the existing orbit and mobile collapse. Add only the Demo badge/title arrangement and clearer state tones. Correct icon semantics using the existing Phosphor family if touched.

- [x] **Step 4: Run GREEN contracts and Dashboard tests**

Run: `npm test -- --run src/i18n/coverage.test.ts src/styles/shell.test.ts src/pages/product-pages.test.tsx src/pages/dashboard/capability-map-data.test.ts`

Expected: all focused tests pass.

---

### Task 4: Independent review and final verification

**Files:**

- Modify: `docs/agent-state.md`
- Modify: `docs/review-state.md`
- Modify: this plan to mark completed steps

- [x] **Step 1: Run scoped Prettier and `git diff --check`**

Format only files touched by this task. Preserve unrelated dirty-worktree changes.

- [x] **Step 2: Run independent read-only reviews**

Review data truthfulness, real-evidence priority, accessibility, i18n, and Dashboard scope. Fix every Critical or Important finding with a failing regression test first.

- [x] **Step 3: Run complete verification**

```bash
npm test -- --run
npm run typecheck
npm run lint
npm run build
git diff --check
```

Expected: every command exits 0. The existing Vite main-chunk size advisory is non-blocking unless it becomes a build failure.

- [x] **Step 4: Refresh project state documents**

Record changed files, exact data flow, no-write proof, test counts, build result, remaining advisories, and preserved boundaries. Do not claim completion before reading fresh outputs.
