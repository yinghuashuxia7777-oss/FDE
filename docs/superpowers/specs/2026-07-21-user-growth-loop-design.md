# AI Growth OS User Growth Loop Design

## Goal

Help a first-time visitor understand the product in five minutes and complete
one evidence-backed growth loop in seven days.

## Boundaries

This sprint changes presentation and local preference state only. It does not
change Legacy Skill, Foundation/Concept/Case/Attempt schemas, Mastery,
IndexedDB, content catalogs, or backend architecture.

## Design

- Extend the existing Dashboard onboarding. Persist only `goal` and
  `experienceLevel` in a versioned localStorage sidecar. Derive the visible
  onboarding phase from those fields and the existing First Mission state.
- Add `/journey` as a presentation layer over existing Skill, Practice, Case,
  Project, and evidence data. Its five stages describe capability outcomes and
  proof, not lessons or curriculum.
- Add a pure Daily Mission projection: Learn → Practice → Challenge → Evidence.
  It references existing IDs and never persists a daily plan.
- Explain capability levels using only existing completed Attempt, Practice,
  and Project evidence. Empty evidence is stated honestly.
- Reuse the existing local Feedback sidecar and surface it from Dashboard and
  Profile. Keep `/profile/demo` isolated and enhance its sales narrative.

## Failure behavior

Malformed learner preferences fail closed to an unselected state. Missing
catalog links degrade to the nearest available entry or an explicit empty
state. No synthesized or fabricated evidence is displayed.

## Verification

Test preference validation/persistence, projections, onboarding behavior,
Journey rendering, Capability Why, Demo isolation, feedback links, routing,
TypeScript, ESLint, Vitest, and production Build.
