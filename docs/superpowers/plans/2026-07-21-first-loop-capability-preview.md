# First-Loop Capability Preview Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show new learners a truthful, layered preview of the capability orbit and the first Learn → Practice → Challenge → Evidence reward loop.

**Architecture:** Compose a presentation-only preview from the existing daily mission and real capability signal builder. Extend the existing orbit with an optional pending-node marker; do not create a second growth system or persist preview state.

**Tech Stack:** React 19, TypeScript, React Router, Vitest, Testing Library, CSS.

## Global Constraints

- Do not modify Legacy Skill, Foundation Schema, Concept Schema, Case Schema, Attempt Schema, Mastery Algorithm, or IndexedDB architecture.
- Do not add a backend, account system, AI API, cloud sync, database, dependency, or alternate learning engine.
- Demo data must remain isolated.
- Do not commit or push without separate explicit approval.

---

### Task 1: Lock the preview contract with tests

**Files:**
- Create: `src/pages/dashboard/FirstLoopPreview.test.tsx`
- Modify: `src/pages/product-pages.test.tsx`
- Modify: `src/pages/dashboard/DashboardVisuals.test.tsx`

**Interfaces:**
- Consumes: existing `CapabilitySignal`, `GrowthMissionStep`, and Dashboard repository fixtures.
- Produces: assertions for one `data-preview="true"` node with `data-mastery="not-started"`, a visible four-step loop, and no demo score.

- [ ] Add a focused component test that renders four existing mission steps and seven unverified capability signals.
- [ ] Assert that the selected node is pending, unscored, and labelled as an after-first-loop unlock.
- [ ] Update the new-user Dashboard integration test to expect the capability preview while continuing to reject active-user cards and repository writes.
- [ ] Run `npm run test:run -- src/pages/dashboard/FirstLoopPreview.test.tsx src/pages/dashboard/DashboardVisuals.test.tsx src/pages/product-pages.test.tsx` and verify the new assertions fail before implementation.

### Task 2: Add the layered first-loop preview

**Files:**
- Create: `src/pages/dashboard/FirstLoopPreview.tsx`
- Modify: `src/pages/dashboard/DashboardVisuals.tsx`
- Modify: `src/pages/dashboard/DashboardPage.tsx`
- Modify: `src/i18n/translations/product-pages.ts`

**Interfaces:**
- Consumes: `signals: readonly CapabilitySignal[]`, `steps: readonly GrowthMissionStep[]`, and `previewSkillId: string | undefined`.
- Produces: `FirstLoopPreview`, plus optional `previewSkillId` support on `CapabilityMapCard`.

- [ ] Add `previewSkillId?: string` to `CapabilityMapCard` and emit `data-preview="true"` only on the matching capability node.
- [ ] Build `FirstLoopPreview` with a result tile, four-step workflow deck, existing capability orbit, and a non-fabrication note.
- [ ] In `DashboardPage`, build blank signals with `buildRealCapabilitySignals`, map the current mission Leaf Skill to its existing parent capability, and render the preview only in New User Mode.
- [ ] Add complete Simplified Chinese and English copy for the preview.
- [ ] Run the focused tests and verify they pass.

### Task 3: Apply responsive layered styling

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `.first-loop-preview*` and `[data-preview='true']` markup.
- Produces: responsive dark glass layers, a pending-node glow, and reduced-motion-safe presentation.

- [ ] Stack onboarding, outcome tile, workflow deck, and orbit with controlled overlap and z-index isolation.
- [ ] Add desktop hierarchy using large typography, translucent panels, soft shadows, background rings, and a single gold pending accent.
- [ ] Collapse the header and workflow into one column on small screens without horizontal overflow.
- [ ] Ensure existing reduced-motion rules disable any pending pulse.

### Task 4: Verify boundaries and release readiness

**Files:**
- Modify only if a verification failure requires a task-scoped correction.

**Interfaces:**
- Consumes: the completed implementation.
- Produces: fresh validation evidence.

- [ ] Run `npm run test:run` and expect all Vitest files to pass.
- [ ] Run `npm run typecheck` and expect exit code 0.
- [ ] Run `npm run lint` and expect exit code 0.
- [ ] Run `npm run build` and expect exit code 0.
- [ ] Inspect `git diff --check`, `git status --short`, and changed-file scope; confirm no schema, persistence, generated dependency, or secret files changed.
