# AI Growth OS Beta Release Hardening Design

Date: 2026-07-21

## Goal

Turn the validated local Beta into a traceable, reversible, automatically deployed release without expanding the product architecture.

## Scope

1. Consolidate the current Beta worktree into a deliberate Git release baseline.
2. Add a local Feedback export so future user-test records can be collected without a backend.
3. Add a minimal Playwright smoke suite for the public critical path.
4. Run the full validation matrix, publish to GitHub `main`, and verify the Cloudflare deployment.

## Release Boundary

- Repository: `https://github.com/yinghuashuxia7777-oss/FDE.git`
- Production branch: `main`
- Hosting effect: a successful push to `main` triggers the existing Cloudflare Pages deployment.
- Include source, authored content, generated source indexes, tests, scripts, release documentation, and required configuration.
- Exclude dependencies, build output, coverage, screenshots, caches, temporary files, local environment files, and credentials.

## Product Changes

### Feedback export

The existing local Feedback page gains a download action. It exports only validated `BetaFeedbackRecord` values already stored by `feedbackStore`, using a deterministic JSON envelope with schema version, export timestamp, and records. Empty feedback remains exportable and no network request is made.

### Browser smoke tests

Playwright covers only the release-critical surfaces:

- a new user can generate an AI Engineer growth profile and see the First Mission;
- the isolated public Demo Profile renders without creating local evidence;
- core public routes load without an application error.

Tests run against a local production preview started by Playwright. They do not introduce a persistent service or production data.

## Validation

- TypeScript
- ESLint
- Prettier
- Vitest
- Playwright smoke suite
- Production build
- V2 validation
- Schema drift
- Git diff and sensitive-file-name audit
- GitHub CI after push
- Cloudflare public URL smoke check

## Explicit Non-Goals

- No Backend, accounts, cloud synchronization, analytics service, or AI API.
- No Skill, Foundation, Concept, Case, Attempt, Mastery, or IndexedDB changes.
- No new learning engine, content expansion, or bundle-architecture refactor.
