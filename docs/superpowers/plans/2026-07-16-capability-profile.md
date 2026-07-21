# Capability Profile Implementation Plan

> **For agentic workers:** Implement task-by-task with test-first changes. The user explicitly forbids Git stage, commit, reset, and unrelated refactoring.

**Goal:** Redefine `/profile` as an evidence-backed AI Engineer Capability Profile without changing Dashboard layout or any training/content persistence contract.

**Architecture:** Extract the Dashboard's readiness and evidence ordering into shared pure product-analysis functions. Keep Profile data loading read-only, retain exact-version case resolution for historical evidence, and derive a presentation-only capability profile from existing Attempt, Mastery, Mistake, Case, and Skill records.

**Tech Stack:** React 19, TypeScript, React Router, existing repository interfaces, existing i18n, native CSS tokens, Phosphor icons, Vitest, Testing Library.

## Global Constraints

- Do not change Dashboard layout, Case Schema, Training, Scoring, Mastery algorithms, Attempt records, IndexedDB, or Content Pack.
- Do not add AI APIs, a backend, a database, mock product data, or a production dependency.
- Use existing real local records only and render explicit empty states when evidence is absent.
- Preserve exact historical case-version behavior and deprecated-attempt history.
- All visible copy must exist in both zh-CN and en-US dictionaries.
- Do not run Git stage, commit, reset, or destructive commands.

---

### Task 1: Shared capability evidence analysis

**Files:**

- Create: `src/application/product/capability-evidence.test.ts`
- Create: `src/application/product/capability-evidence.ts`
- Modify: `src/application/product/index.ts`
- Modify: `src/pages/dashboard/DashboardPage.tsx`

**Interfaces:**

- Produces `calculateEvidenceReadiness(activeSkillIds, mastery)` with the exact sample-weighted Dashboard formula.
- Produces `buildCapabilityEvidenceRecords(trustedAttempts)` sorted by completed time and stable attempt ID.
- Produces `buildSkillEvidenceProfiles(definitions, mastery, mistakes, trustedAttempts)` with real mastery, critical-risk, sample-count, and latest-evidence signals.
- Produces `buildCompletedChallengeProfiles(trustedAttempts)` grouped by stable case ID while retaining the selected exact version.

- [x] **Step 1: Write failing pure-function tests**

```ts
expect(
  calculateEvidenceReadiness(
    new Set(['skill-a', 'skill-b']),
    [mastery('skill-a', 80, 3), mastery('skill-b', 20, 1)],
  ),
).toBe(65);

expect(
  buildSkillEvidenceProfiles(skills, masteryRecords, criticalMistakes, trusted)
    .find(({ skillId }) => skillId === 'skill-a'),
).toMatchObject({
  sampleCount: 3,
  status: 'Competent',
  criticalMistakeCount: 1,
  risk: 'critical',
  latestEvidence: { title: 'Exact historical case' },
});
```

- [x] **Step 2: Run RED test**

Run: `npm test -- --run src/application/product/capability-evidence.test.ts`

Expected: FAIL because the new analysis module does not exist.

- [x] **Step 3: Implement the minimal pure functions**

Keep all types presentation-only and derive every value from existing records. Do not persist profile output.

- [x] **Step 4: Replace Dashboard-local readiness/evidence ordering with imports**

Dashboard JSX, layout, and active-content filtering must remain unchanged: only published active cases enter its visible evidence list.

- [x] **Step 5: Run GREEN and Dashboard regression tests**

Run: `npm test -- --run src/application/product/capability-evidence.test.ts src/pages/product-pages.test.tsx`

Expected: PASS.

---

### Task 2: Capability Profile page behavior

**Files:**

- Create: `src/pages/profile/ProfilePage.test.tsx`
- Create: `src/pages/profile/CapabilityProfileView.tsx`
- Modify: `src/pages/profile/ProfilePage.tsx`
- Modify: `src/pages/slice-b-pages.test.tsx`

**Interfaces:**

- Profile loader reads completed attempts, mistakes, skill mastery, active skills, and exact historical case versions.
- View consumes only derived values and produces no repository writes.
- Missing exact versions remain visible as a warning and are excluded only from verified evidence.

- [x] **Step 1: Write the data-rich page test**

```tsx
expect(
  await screen.findByRole('heading', {
    name: 'AI Engineer Capability Profile',
  }),
).toBeVisible();
expect(screen.getByRole('region', { name: 'Identity summary' })).toHaveTextContent(
  'Production AI Engineer',
);
expect(screen.getByRole('region', { name: 'Skill evidence map' })).toHaveTextContent(
  'Exact historical case',
);
expect(screen.getByRole('region', { name: 'Verified evidence timeline' })).toHaveTextContent(
  '92',
);
```

- [x] **Step 2: Write the no-evidence page test**

Assert that the page shows zero collected records, unavailable readiness, and explicit empty states without synthetic capabilities or challenges.

- [x] **Step 3: Run RED page test**

Run: `npm test -- --run src/pages/profile/ProfilePage.test.tsx`

Expected: FAIL on the old Profile information architecture.

- [x] **Step 4: Implement the new page and focused view components**

Render Identity Summary, Engineering Readiness, Skill Evidence Map, Strengths & Growth Areas, Verified Evidence Timeline, and Completed Challenges. Use semantic headings, lists, links to exact debrief attempts, and a readiness meter.

- [x] **Step 5: Run GREEN page tests**

Run: `npm test -- --run src/pages/profile/ProfilePage.test.tsx src/pages/slice-b-pages.test.tsx`

Expected: PASS with no repository-write calls.

---

### Task 3: AI Growth OS presentation and i18n

**Files:**

- Modify: `src/i18n/translations/product-pages.ts`
- Modify: `src/styles/global.css`
- Modify: `src/styles/shell.test.ts`

- [x] **Step 1: Add failing translation and CSS contract assertions**

Assert the new profile headings exist in zh-CN and en-US, the profile grid has explicit mobile collapse, and the readiness meter uses the existing semantic theme tokens.

- [x] **Step 2: Run RED contracts**

Run: `npm test -- --run src/i18n/coverage.test.ts src/styles/shell.test.ts`

Expected: FAIL until the new copy and profile selectors exist.

- [x] **Step 3: Add localized copy and scoped profile CSS**

Use the existing card radius, cool-neutral surfaces, blue accent, tinted shadow, dark-mode tokens, focus states, and reduced-motion behavior. Do not add a new visual system or dependency.

- [x] **Step 4: Run GREEN contracts and page tests**

Run: `npm test -- --run src/i18n/coverage.test.ts src/styles/shell.test.ts src/pages/profile/ProfilePage.test.tsx`

Expected: PASS.

---

### Task 4: Final verification and review state

**Files:**

- Modify: `docs/review-state.md`
- Modify: `docs/agent-state.md`

- [x] **Step 1: Format changed files**

Run the project-local Prettier binary against only touched files.

- [x] **Step 2: Run full verification**

Run in parallel where safe:

```bash
npm test -- --run
npm run typecheck
npm run lint
npm run build
git diff --check
```

Expected: every command exits 0. An existing Vite chunk-size advisory is non-blocking unless it changes into a build failure.

- [x] **Step 3: Refresh the concise review package**

Record scope, data sources, preserved boundaries, exact test counts, build result, and any remaining advisory. Do not claim completion until fresh verification output is read.
