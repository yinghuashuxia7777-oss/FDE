# Active Dashboard Depth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the real active-user Dashboard a visible three-level floating hierarchy without changing its content or data architecture.

**Architecture:** Use the existing `data-dashboard-mode="active"` boundary and current Dashboard classes as the visual API. Add only scoped CSS and a CSS contract test; do not add components or runtime state.

**Tech Stack:** React 19, TypeScript 6, CSS custom properties, Vitest, Playwright, Vite.

## Global Constraints

- Preserve Dashboard DOM order, routes, calculations, and responsive information architecture.
- Do not change content, schemas, Attempt, Mastery, or IndexedDB.
- Do not add dependencies or continuous floating animations.
- Do not commit or push without explicit approval.

---

### Task 1: Lock the active Dashboard depth contract

**Files:**
- Modify: `src/styles/surface-depth.test.ts`

**Interfaces:**
- Consumes: `.dashboard-command-center[data-dashboard-mode='active']`, `.growth-mission`, `.growth-os-grid`, `.capability-map`, `.challenge-card`, `.evidence-timeline`.
- Produces: a regression contract for atmosphere, stage depth, and foreground depth.

- [x] **Step 1: Write the failing test**

Add assertions that require:

```ts
expect(globalCss).toMatch(
  /\.dashboard-command-center\[data-dashboard-mode='active'\]\s*\{[^}]*isolation:\s*isolate[^}]*background:/s,
);
expect(globalCss).toMatch(
  /\.dashboard-command-center\[data-dashboard-mode='active'\] \.capability-map\s*\{[^}]*box-shadow:\s*var\(--shadow-float-front\)/s,
);
expect(globalCss).toMatch(
  /\.dashboard-command-center\[data-dashboard-mode='active'\] :is\(\.growth-mission, \.challenge-card, \.evidence-timeline\)\s*\{[^}]*z-index:\s*4[^}]*box-shadow:\s*var\(--shadow-float-front\)/s,
);
```

- [x] **Step 2: Verify RED**

Run: `npm run test:run -- src/styles/surface-depth.test.ts`

Expected: FAIL because the active Dashboard does not yet define the three depth layers.

### Task 2: Implement the scoped visual hierarchy

**Files:**
- Modify: `src/styles/global.css`

**Interfaces:**
- Consumes: `--shadow-card`, `--shadow-float`, `--shadow-float-front`, existing grid areas and active Dashboard mode.
- Produces: atmosphere, support surfaces, central capability stage, foreground action surfaces, and mobile normalization.

- [x] **Step 1: Add active-mode atmosphere**

Create a positioned, isolated active Dashboard canvas with radial gradients and non-interactive orbit-ring pseudo-elements.

- [x] **Step 2: Lower the generic card plane**

Within active mode, reduce border contrast, use translucent raised surfaces, and assign `--shadow-card` to support cards.

- [x] **Step 3: Raise the capability stage**

Assign the Capability Map `z-index: 3`, `--shadow-float-front`, a small static lift, and a stronger local radial light.

- [x] **Step 4: Raise action surfaces**

Assign Growth Mission, Challenge, and Evidence `z-index: 4`, `--shadow-float-front`, and controlled overlap. Keep Journey, Readiness, and Mentor behind them.

- [x] **Step 5: Normalize mobile**

At `max-width: 47.999rem`, remove active Dashboard negative margins and transforms while retaining shadows.

- [x] **Step 6: Verify GREEN**

Run: `npm run test:run -- src/styles/surface-depth.test.ts src/styles/shell.test.ts src/pages/dashboard/DashboardVisuals.test.tsx src/pages/product-pages.test.tsx`

Expected: PASS.

### Task 3: Full verification

**Files:**
- No production changes expected.

- [x] **Step 1: Check formatting and diff integrity**

Run: `npx prettier --check src/styles/global.css src/styles/surface-depth.test.ts && git diff --check`

- [x] **Step 2: Run full validation**

Run: `npm run test:run`, `npm run typecheck`, `npm run lint`, `npm run build`, and `npm run test:e2e`.

Expected: all commands exit `0`; the temporary Playwright preview server stops automatically.
