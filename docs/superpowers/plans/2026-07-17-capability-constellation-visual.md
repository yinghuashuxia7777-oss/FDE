# Capability Constellation Visual Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refine the existing Capability Map into a premium AI Engineer
Capability Constellation without changing any capability data or application
logic.

**Architecture:** Keep the existing `CapabilityMapCard` props and
`CapabilitySignal[]` boundary. Add presentation-only DOM hooks in
`DashboardVisuals.tsx`, then implement all depth, orbit, node, state, motion,
and responsive behavior in scoped CSS. Existing Dashboard/provider logic stays
untouched.

**Tech Stack:** React 19, TypeScript, native CSS, existing semantic tokens,
Phosphor Icons, Vitest, Testing Library.

## Global Constraints

- Do not modify `src/pages/dashboard/capability-map-data.ts` or its test.
- Do not modify `CapabilitySignal`, Demo values, real-evidence detection,
  Mastery, Repository, Attempt, Skill data, or Dashboard data flow.
- Do not add visible copy, fake data, dependencies, routes, services, or assets.
- Do not stage, commit, reset, or perform destructive Git operations.
- Preserve light, dark, system, reduced-motion, and reduced-transparency modes.

---

### Task 1: Lock the presentation-only DOM contract

**Files:**

- Modify: `src/pages/product-pages.test.tsx`
- Modify: `src/pages/dashboard/DashboardVisuals.tsx`

**Interfaces:**

- Consumes: existing `CapabilityMapCardProps` and `CapabilitySignal[]`
- Produces: `data-showcase`, `.capability-map__source`, a third orbit ring,
  `.capability-node__copy`, and existing seven `data-skill-id` nodes

- [x] **Step 1: Write the failing Demo DOM test**

Add assertions to the existing new-user Dashboard test:

```ts
expect(capabilityMap).toHaveAttribute('data-showcase', 'true');
expect(capabilityMap.querySelectorAll('.capability-orbit__ring')).toHaveLength(3);
expect(capabilityMap.querySelectorAll('.capability-node__glyph')).toHaveLength(7);
expect(capabilityMap.querySelectorAll('.capability-node__copy')).toHaveLength(7);
expect(capabilityMap.querySelector('.capability-map__source')).toHaveTextContent(
  'Alex Chen',
);
```

- [x] **Step 2: Write the failing real-mode marker test**

In the existing real-evidence Dashboard test, assert:

```ts
expect(capabilityMap).not.toHaveAttribute('data-showcase');
```

- [x] **Step 3: Run the RED test**

Run:

```bash
npm test -- --run src/pages/product-pages.test.tsx
```

Expected: fail because the new presentation markers and third ring do not yet
exist.

- [x] **Step 4: Add only presentation markup**

In `CapabilityMapCard`:

```tsx
<figure
  className="growth-card capability-map"
  aria-label={title}
  data-showcase={badgeLabel === undefined ? undefined : 'true'}
>
```

Add `className="capability-map__source"` to the existing source paragraph,
add `.capability-orbit__ring--three`, and add
`className="capability-node__copy"` to the existing node copy wrapper. Do not
change any prop, signal value, label, ordering, or conditional.

- [x] **Step 5: Run the GREEN test**

Run:

```bash
npm test -- --run src/pages/product-pages.test.tsx
```

Expected: all product-page tests pass.

---

### Task 2: Lock and implement the constellation visual contract

**Files:**

- Modify: `src/styles/shell.test.ts`
- Modify: `src/styles/global.css`

**Interfaces:**

- Consumes: the presentation classes from Task 1 and existing semantic tokens
- Produces: visual node rings, center sphere/halo, three orbit rings,
  tone-aware connectors, and a mobile list layout

- [x] **Step 1: Write failing CSS contracts**

Extend the existing Growth OS CSS test to require:

```text
.capability-orbit__ring--three exists
.capability-orbit__core uses isolation and a halo pseudo-element
.capability-node is a centered grid on desktop
.capability-node__glyph has a semantic tone ring and tinted shadow
.capability-node__copy is centered on desktop
mobile nodes use auto + minmax(0, 1fr) columns and left-aligned copy
motion exists only in prefers-reduced-motion: no-preference
```

- [x] **Step 2: Run the RED CSS test**

Run:

```bash
npm test -- --run src/styles/shell.test.ts
```

Expected: fail on the missing third ring, halo, node composition, and mobile
list declarations.

- [x] **Step 3: Implement desktop constellation styling**

Update only `.capability-map*`, `.capability-orbit*`, and `.capability-node*`
rules. Use the existing surface, border, accent, success, warning, muted,
radius, space, and duration tokens. Keep the core dark in both themes while
its halo and ring use semantic accent tokens.

- [x] **Step 4: Implement mobile list styling**

Inside the existing `max-width: 47.999rem` block, retain the visible core and
hide rings/connectors. Render each skill node as a horizontal grid with a
state-ring icon and left-aligned copy. Preserve the `max-width: 30rem`
single-column rule.

- [x] **Step 5: Implement restrained motion**

Inside `prefers-reduced-motion: no-preference`, add a short node opacity reveal
and a slow transform/opacity core-halo animation. Do not animate layout
properties or add JavaScript motion.

- [x] **Step 6: Run GREEN focused tests**

Run:

```bash
npm test -- --run src/styles/shell.test.ts src/pages/product-pages.test.tsx src/i18n/coverage.test.ts
```

Expected: all focused tests pass.

---

### Task 3: Review and final verification

**Files:**

- Modify: `docs/agent-state.md`
- Modify: `docs/review-state.md`
- Modify: this plan to mark completed steps

**Interfaces:**

- Produces: fresh verification evidence and the persistent concise review state

- [x] **Step 1: Run independent read-only reviews**

Review frozen data boundaries, light/dark tokens, mobile layout,
reduced-motion behavior, visible copy, and accessibility. Fix every Critical or
Important finding with a failing regression test first.

- [x] **Step 2: Run scoped formatting and complete verification**

```bash
./node_modules/.bin/prettier --check src/pages/dashboard/DashboardVisuals.tsx src/pages/product-pages.test.tsx src/styles/global.css src/styles/shell.test.ts docs/agent-state.md docs/review-state.md docs/superpowers/specs/2026-07-17-capability-constellation-visual-design.md docs/superpowers/plans/2026-07-17-capability-constellation-visual.md
npm test -- --run
npm run typecheck
npm run lint
npm run build
git diff --check
```

Expected: every command exits 0. The existing Vite main-chunk advisory remains
non-blocking.

- [x] **Step 3: Refresh status documents**

Record the exact UI files, unchanged data boundaries, test counts, build
result, independent-review outcome, and remaining advisory. Do not claim visual
browser QA because no service is started in this task.
