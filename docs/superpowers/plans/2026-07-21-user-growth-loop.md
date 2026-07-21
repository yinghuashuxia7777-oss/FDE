# AI Growth OS User Growth Loop Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the existing capability loop into a first-user journey with a daily retention surface and evidence explanations.

**Architecture:** Extend existing onboarding and evidence projections. Add one presentation-only Journey route and one versioned preference sidecar. Reuse all existing catalogs and persistence boundaries.

**Tech Stack:** React, TypeScript, React Router, localStorage sidecars, Vitest, Testing Library, existing i18n and CSS.

## Global Constraints

- Do not modify stable schemas, IDs, Attempt, Mastery, or IndexedDB.
- Do not add content catalogs, backend, account, AI API, cloud sync, or dependencies.
- Keep changes local-first and additive.

---

### Task 1: Learner preferences and projections

**Files:**
- Create: `src/application/onboarding/learner-preferences.ts`
- Create: `src/application/onboarding/growth-loop.ts`
- Test: `src/application/onboarding/user-growth-loop.test.ts`

- [ ] Write failing tests for strict preference parsing and stable mission/stage projections.
- [ ] Run the focused tests and confirm the expected missing-feature failures.
- [ ] Implement minimal sidecar and pure projection functions.
- [ ] Run focused tests to green.

### Task 2: Existing onboarding upgrade and Journey page

**Files:**
- Modify: `src/components/onboarding/LearningJourneyContext.tsx`
- Modify: `src/components/onboarding/NewUserLearningJourney.tsx`
- Create: `src/pages/journey/JourneyPage.tsx`
- Modify: `src/app/router.tsx`
- Test: `src/components/onboarding/NewUserLearningJourney.test.tsx`
- Test: `src/pages/user-growth-loop.test.tsx`

- [ ] Write failing behavior tests for goal, level, value statement, Journey route, and seven days.
- [ ] Verify RED.
- [ ] Implement the minimal UI by extending existing components.
- [ ] Verify GREEN.

### Task 3: Daily Mission, Capability Why, Demo, and feedback entry

**Files:**
- Modify: `src/pages/dashboard/DashboardPage.tsx`
- Modify: `src/pages/dashboard/DashboardVisuals.tsx`
- Modify: `src/pages/profile/CapabilityProfileView.tsx`
- Modify: `src/pages/profile/PublicDemoProfilePage.tsx`
- Modify: `src/application/practice/beta-sidecar.ts`
- Modify: `src/pages/feedback/FeedbackPage.tsx`
- Test: `src/pages/user-growth-loop.test.tsx`

- [ ] Write failing tests for Learn/Practice/Challenge/Evidence, real Why evidence, isolated Demo sections, and feedback links.
- [ ] Verify RED.
- [ ] Implement only presentation and projection changes.
- [ ] Verify GREEN.

### Task 4: Copy, navigation, styling, and release report

**Files:**
- Modify: `src/i18n/translations/onboarding-ui.ts`
- Modify: `src/i18n/translations/product-pages.ts`
- Modify: `src/i18n/translations/shell-settings.ts`
- Modify: `src/components/layout/ApplicationShell.tsx`
- Modify: `src/styles/global.css`
- Create: `docs/user-growth-loop-report.md`

- [ ] Add bilingual copy and focused responsive styles.
- [ ] Run format, focused tests, TypeScript, and ESLint.
- [ ] Run all Vitest tests and production Build.
- [ ] Record pages, journey changes, data boundaries, and exact verification results.
