# FDE Arena Approved Design

## Status

This design translates the user-supplied final specification into implementable product decisions. The source specification explicitly authorizes implementation without another approval round, so this document is treated as approved unless it contradicts `docs/product-spec.md`.

## Product shape

FDE Arena is a local-first, single-user training workspace for Forward Deployed Engineer skills. It combines learning, interview practice, incident response, architecture judgment, delivery judgment, and customer communication in branching cases. Every answer is objective and every score must be grounded in evidence, priority, and risk.

The MVP includes eight product areas: dashboard, case library, training, debrief, skill map, mistake notebook, capability profile, and settings/data. It ships 24 playable cases, a planned 338-case registry, content validation, coverage auditing, IndexedDB persistence, import/export, dual themes, and static deployment.

## Considered implementation approaches

### A. JSON content plus generated application index (selected)

Cases live as versioned JSON under `content/cases`. Zod is the runtime source of truth; build scripts validate JSON, audit graphs and coverage, and generate an import index consumed by the application. Validated published content is seeded into IndexedDB and accessed only through repository interfaces.

This best preserves content/UI separation, makes quality scripts first-class, and lets future content tooling operate without importing React code.

### B. TypeScript case modules

This provides excellent editor inference but couples content to the TypeScript build, makes non-developer editing harder, and weakens the requirement for standalone JSON Schema validation.

### C. Runtime fetch from `public/content`

This keeps content highly independent but adds request/error states, complicates static-file and offline behavior, and creates two initialization paths. It is unnecessary for the local MVP.

## Architecture

The dependency direction is:

```text
pages and components
  -> application services and training reducer
  -> pure domain evaluation, scoring, mastery, recommendation
  -> repository contracts
  -> IndexedDB adapters
```

Content follows a separate pipeline:

```text
content JSON
  -> Zod and JSON Schema validation
  -> graph and answer validation
  -> coverage audit
  -> generated case index
  -> first-run IndexedDB seed
```

React components never access IndexedDB directly. The application uses a fixed `local-user` profile and HashRouter so static hosting works without server rewrites.

## Question and training model

`CaseNode` becomes a discriminated union. Single choice and its evidence presentation variants share a choice answer; multiple choice, ordering, matching, and evidence-conclusion have dedicated answer shapes. Every submitted answer is normalized to an `EvaluationResult` containing correctness, score, error types, critical errors, consequences, and a branch key.

A training session uses an explicit reducer with `loading`, `active`, `feedback`, `advancing`, and `completed` states. Wrong rounds remain on the node. Round one returns an error category, round two returns directional guidance, and round three reveals the answer with zero node score. Correct rounds use 100, 60, and 30 percent multipliers. The attempt stores every round, not only the final answer.

Verdicts use normalized case score: 85+ excellent, 70+ pass, 55+ marginal, below 55 fail. Any critical error overrides the numeric verdict with critical risk.

## Persistence and versioning

IndexedDB stores case versions, attempts, progress, mastery, mistakes, settings, coverage, and app metadata. Attempts bind both case ID and immutable case version. Content upgrades create a new version instead of silently replacing historical content.

Import/export uses an envelope with `formatVersion`, `appVersion`, `exportedAt`, and `payload`. Import is validate-first and transactional. Invalid or unsupported data leaves current storage untouched. Clearing progress requires explicit confirmation.

## Error handling

- Content bootstrap failure shows a recoverable application error with a retry action.
- Storage quota or migration errors preserve existing data and explain recovery options.
- Invalid imports report field-level validation issues and do not partially write.
- Missing or deprecated cases remain recoverable for historical debriefs.
- All evidence is rendered as escaped text; content is never injected as HTML.

## Testing strategy

Pure domain tests cover every evaluation and scoring path before implementation. Repository tests use a test IndexedDB environment. Component tests query semantic roles and verify keyboard, adaptive feedback, evidence rendering, and responsive disclosure. Playwright covers the complete local journey, persistence refresh, export, clear, and import restore. Content scripts test schema validity, IDs, graphs, answers, explanations, review metadata, and coverage.

## Explicit scope decisions

- Fourteen domains are canonical.
- The MVP does not include PWA/service-worker caching; all runtime assets are bundled and no API is required while answering.
- The MVP does not implement cloud repositories, authentication, live AI generation, analytics, payments, or a content-admin UI.
- Expert cases remain schema-compatible but hidden from MVP navigation.
- Target-role recommendations use the default FDE profile until a later product adds role selection.

