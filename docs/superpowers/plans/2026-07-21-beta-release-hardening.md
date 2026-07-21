# AI Growth OS Beta Release Hardening Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Produce a tested, reversible Beta release on GitHub `main` that automatically deploys to Cloudflare Pages.

**Architecture:** Keep the application local-first. Add one pure feedback-export serializer plus a browser download adapter, and use Playwright only as a release smoke harness around the existing production build. Treat the current worktree as one Beta release candidate after an explicit inclusion and secret-name audit.

**Tech Stack:** React 19, TypeScript, Vitest, Playwright, Vite, GitHub Actions, Cloudflare Pages.

## Global Constraints

- Do not modify Legacy Skill, Foundation/Concept/Case/Attempt schemas, Mastery, or IndexedDB architecture.
- Do not add Backend, accounts, AI API, cloud sync, analytics, or a new database.
- Keep all product data local-first and Demo data isolated.
- Do not commit `.env*`, credentials, dependencies, build output, screenshots, caches, or temporary files.
- Never force-push or rewrite published history.

---

### Task 1: Release inventory and repository hygiene

**Files:**
- Modify: `.gitignore`
- Create: `docs/releases/2026-07-21-beta-release.md`

**Interfaces:**
- Consumes: current Git worktree and existing validation scripts.
- Produces: an explicit release inclusion boundary and clean release notes.

- [ ] Inspect every modified/untracked path by name and classify source, generated source, documentation, or local artifact.
- [ ] Add only confirmed local artifacts to `.gitignore`; preserve authored project files.
- [ ] Verify no environment, credential, dependency, build, cache, coverage, or screenshot path will be staged.
- [ ] Record the release capability, boundaries, validation commands, and deployment target.

### Task 2: Local Feedback export

**Files:**
- Modify: `src/application/practice/beta-sidecar.ts`
- Test: `src/application/practice/beta-sidecar.test.ts`
- Modify: `src/pages/feedback/FeedbackPage.tsx`
- Test: `src/pages/beta-productization.test.tsx`
- Modify: `src/i18n/translations/product-pages.ts`

**Interfaces:**
- Consumes: `feedbackStore.read(): BetaFeedbackRecord[]`.
- Produces: `serializeFeedbackExport(records, exportedAt): string` and a local JSON download action.

- [ ] Write a failing unit test requiring a versioned deterministic JSON envelope.
- [ ] Run the focused unit test and confirm it fails because the serializer is missing.
- [ ] Implement the pure serializer with `schemaVersion: 1`, `exportedAt`, and validated records.
- [ ] Run the focused test and confirm it passes.
- [ ] Write a failing page test requiring an Export Feedback action with no network call.
- [ ] Run the page test and confirm it fails because the action is absent.
- [ ] Add the browser download adapter and bilingual copy.
- [ ] Run the focused page test and confirm it passes.

### Task 3: Playwright release smoke suite

**Files:**
- Create: `playwright.config.ts`
- Create: `e2e/beta-smoke.spec.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: production build and Vite preview.
- Produces: `npm run test:e2e` covering new-user onboarding, Demo isolation, and core route availability.

- [ ] Add Playwright configuration using the existing dependency, Chromium, a temporary local preview, and retained failure artifacts only.
- [ ] Add smoke assertions for profile generation, First Mission, isolated Demo Profile, and core routes.
- [ ] Run `npm run test:e2e` and confirm the tests exercise the production build.
- [ ] If the required browser binary is unavailable, stop and request approval before downloading it.

### Task 4: Full release verification

**Files:**
- Modify: `docs/releases/2026-07-21-beta-release.md`

**Interfaces:**
- Consumes: completed release candidate.
- Produces: fresh validation evidence recorded in the release notes.

- [ ] Run `npm run typecheck`.
- [ ] Run `npm run lint`.
- [ ] Run `npm run format:check`.
- [ ] Run `npm run test:run`.
- [ ] Run `npm run test:e2e`.
- [ ] Run `npm run build` and confirm content quality, index drift, V2 validation, and schema drift pass.
- [ ] Inspect the final staged diff and record exact outcomes.

### Task 5: GitHub and Cloudflare publication

**Files:**
- No additional product files.

**Interfaces:**
- Consumes: verified Git release candidate.
- Produces: Git commit on the production lineage, GitHub `main`, CI evidence, and Cloudflare deployment evidence.

- [ ] Verify `gh` authentication, remote ownership, remote default branch, and current remote state.
- [ ] Fetch without modifying local files and stop if remote `main` has incompatible commits.
- [ ] Stage only the audited release paths and verify no sensitive/local artifacts are included.
- [ ] Commit the Beta release and record the commit hash.
- [ ] Push without force to `origin/main` only if it is a fast-forward update.
- [ ] Verify GitHub CI for the pushed commit.
- [ ] Verify the Cloudflare public URL loads the new release and critical routes.
- [ ] Record the final commit, branch, validation, CI, and deployment result in the handoff.
