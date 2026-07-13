# FDE Arena MVP Content Production Implementation Plan

**Goal:** Move the validated content-platform foundation into a production-ready MVP content phase without changing the established architecture.

**Global constraints:** Keep `DomainDefinition.status` and `SkillDefinition.status` as the only activation truth; do not add CMS, backend, accounts, cloud sync, dependencies, or long-running services; preserve existing uncommitted work and stable IDs; all content must pass the existing Case Schema and graph/content validators.

## Task 1 — Remove activation dual sources

- Add failing contract/validator tests proving content config no longer accepts or needs `activeDomainIds` / `activeSkillIds`.
- Remove those fields from `ContentConfig`, its schema, config JSON, and validation fixtures/checks.
- Keep the runtime catalog fields, derived exclusively from definition statuses.
- Run the focused content contract and validator/index tests.

## Task 2 — Establish authoring standards

- Add `docs/FDE_CONTENT_GUIDE.md`, `docs/CASE_WRITING_GUIDE.md`, `docs/REVIEW_CHECKLIST.md`, `docs/SKILL_TAXONOMY.md`, and `docs/CASE_TEMPLATE.md`.
- Define scenario, evidence-chain, decision-node, distractor, explanation, lifecycle, review, and three-level difficulty standards using the current 15-domain taxonomy.

## Task 3 — Add 24 MVP cases

- Add 12 beginner, 8 intermediate, and 4 advanced scenario cases under `content/cases`.
- Give every case/node/option/evidence item a stable ID and include scenario, evidence chain, correct path, distractor explanations, root cause, remediation, and verification.
- Publish the cases through `content-config.json`, bump the content version, and regenerate deterministic content artifacts.

## Task 4 — Add content-quality gate

- First add failing tests for a pure case-quality audit API.
- Implement checks for schema/readiness, registered skills, level rules, scenario/evidence completeness, root cause, remediation, verification, and non-trivia.
- Add a `content:quality` CLI command and make the production build execute it.

## Task 5 — Show coverage status in Settings

- First add failing UI tests for total cases, difficulty distribution, domain coverage, and progress toward 362.
- Load active published cases through the existing repositories and derive display data from the installed pack/coverage plan.
- Add only the minimal styles needed for the new read-only status panel.

## Task 6 — Verify and review

- Run focused tests throughout red/green cycles.
- Run `content:validate`, `content:quality`, `content:check`, tests, typecheck, lint, format check, and build with bounded execution.
- Review the final diff against all five phases and update `docs/agent-state.md` with decisions, changed files, commands, results, risks, and do-not-touch rules.
