# AI Growth OS MVP Capability Loop

## Decision

Ship a bounded, additive MVP layer: 30 reviewed Leaf Skills, 30 draft Rubrics,
20 exact Case mappings, 30 draft Practices, three Project definitions, and a
read-only capability projection. The existing Legacy Mastery system remains the
write model; MVP Leaf capability is derived at read time from completed Attempts.

## Data flow

```text
Knowledge -> Practice definition -> Case challenge
  -> completed Attempt + exact Case attribution
  -> read-only Leaf evidence projection
  -> Capability Map / Capability Profile
```

No Attempt, Mastery, IndexedDB, Case, Foundation, Concept, or Legacy Skill data
is rewritten. An Attempt contributes its authored score to each mapped primary
Leaf and exposes secondary Leaves as supporting evidence; weights are never
invented or averaged.

## Content boundaries

- Skill Catalog: one reviewed 0.2.0 MVP release with `expectedLeafCount: 30`.
- Rubrics: one draft rubric per Leaf, sufficient to validate Practice content.
- Attribution: 20 exact active Case versions; each Case has one primary and at
  most two secondary Leaves, explicit evidence type, node, rationale, reviewer.
- Practices: one Concept, one Leaf, one scored action, 3–8 minutes.
- Projects: three definition-only templates with explicit required Leaves and
  deliverables. No Project runtime, persistence, completion, or score.

## UI boundary

The Dashboard layout is unchanged. Its existing Capability Map provider may
consume the read-only projection when completed mapped Cases exist. The Profile
adds a compact MVP Leaf evidence section inside the existing page. Demo data is
an exported immutable fixture used only when no real evidence exists.

## Safety and rollback

All additions are sidecar content or pure read models. Removing the MVP content
imports returns the application to Legacy behavior without a migration.
