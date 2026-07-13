# FDE Arena Foundation Knowledge Layer Design

## Status

Approved by the user-supplied implementation task
`FDE_Arena_Foundation_Knowledge_System_实施任务.md` and the explicit instruction
to execute it without reopening the stable FDE Arena architecture.

## Goal

Add a beginner-friendly Foundation Knowledge Layer that explains prerequisite
concepts, connects every concept to existing stable Skill and Case IDs, and
guides learners from knowledge to real case practice without changing the
existing Content Pack, Case, Training, Scoring, Mastery, Attempt, or IndexedDB
contracts.

## Scope

The MVP contains 30 authored Foundation items:

- 10 computer-basics items.
- 10 network/API items.
- 10 AI-basics items.

Every item contains a one-sentence explanation, analogy, technical explanation,
real example, common mistakes, at least one existing Skill ID, and at least one
active Case ID.

The UI adds:

- an FDE Foundation overview on the Dashboard;
- a full Foundation overview route;
- a Foundation detail route;
- related Skill and Case information;
- a prerequisite gate before a new Case Attempt is created.

CMS, backend, accounts, cloud sync, online editing, a new database, and AI
content generation remain out of scope.

## Chosen architecture

### Independent content layer

Foundation files live under `content/foundation/<module>/`. They are validated
and indexed by project content tooling, but are deliberately excluded from
`ContentPack`, `ContentManifest`, its checksum, `ContentInstaller`, and
IndexedDB. This preserves the already-approved Content Pack contract and keeps
Foundation failure isolated from installed Case history.

`FoundationKnowledgeSchema` is the single runtime and authoring contract.
`LocalFoundationSource` loads the deterministic generated index, validates each
JSON object, deep-freezes the snapshot, and exposes a small `FoundationSource`
interface. The first implementation is bundled and local; no remote loading is
added.

### Foundation item contract

```ts
interface FoundationKnowledge {
  schemaVersion: 1;
  id: string;
  type: 'foundation';
  title: string;
  domain: string;
  track: 'computer-basics' | 'network-api' | 'ai-basics';
  skills: string[];
  level: 'beginner' | 'intermediate' | 'advanced';
  order: number;
  estimatedMinutes: number;
  content: {
    simpleExplanation: string;
    analogy: string;
    technicalExplanation: string;
    example: string;
    commonMistakes: string;
  };
  relatedCases: string[];
}
```

IDs use the same lowercase dot/dash-safe convention as the rest of the content
platform. `domain` identifies the Foundation directory/module; `track` groups
the 30-item MVP into the three progress summaries required by the task. `order`
is explicit so titles and filenames can change without silently changing the
learning path.

### Validation and indexing

The existing complete content validation additionally scans
`content/foundation` and checks:

- JSON and Foundation Schema validity;
- globally unique Foundation IDs;
- non-empty complete authored content;
- every referenced Skill exists and is active;
- every referenced Case exists in the active published Case catalog;
- the file's module directory matches the authored `domain`;
- every item has at least one Skill and one related Case.

Foundation validation does not mutate or extend `ContentPackSchema`.

The generated `src/generated/foundation-index.ts` contains deterministic
metadata and lazy JSON loaders. The existing content artifact check includes
the Foundation JSON Schema and index so drift fails the same build gate, while
the Content Pack manifest and checksum remain unchanged.

### Progress semantics

No new progress store is created. Foundation progress is an evidence-based
projection over existing `SkillMasteryRecord` and immutable `AttemptRecord`
history:

- `not-started`: no linked Skill has samples and no related Case has an Attempt.
- `learning`: at least one linked Skill has samples or a related Case has been
  attempted, but the mastery rule is not yet met.
- `mastered`: every linked Skill has at least one sample and score `>= 60`, and
  at least one completed Attempt for a related Case has verdict `pass` or
  `excellent`.

Historical passing Attempts continue to count even if a later retry fails; the
current Skill scores still have to remain at or above 60. This uses stable
`caseId` across Case versions and avoids inferring a pass from highest score or
the latest Progress snapshot.

Track progress is `mastered items / total items`. The UI labels this as
capability-verified progress, not reading completion. The next Foundation item
is the first `learning` item by authored order, otherwise the first
`not-started` item. This keeps Foundation, Skill, Case, and Mastery as one
learning system and avoids an unportable localStorage progress island.

### Pages and navigation

`/foundation` shows three track summaries, overall progress, a continue-learning
action, and all 30 items with status.

`/foundation/:foundationId` shows the authored sections in this order:

1. one-sentence understanding;
2. life analogy;
3. technical explanation;
4. real case example;
5. common mistakes;
6. related Skills and current Mastery;
7. related active Cases;
8. start-practice action.

Dashboard adds a compact Foundation panel before Today's Training. Desktop
navigation receives a Foundation destination; mobile navigation places it in
the existing accessible More drawer to avoid crowding the fixed bottom bar.
All new UI chrome is translated in Simplified Chinese and English. Authored
Foundation content remains content-pack-style authored Chinese and is not
machine-translated at runtime.

### Prerequisite gate

`TrainingRoutePage` remains the boundary that resolves an active Case. Its new
flow is:

1. load the active exact Case version and any in-progress Attempts;
2. if a matching in-progress Attempt exists, resume it immediately;
3. otherwise load Foundation items whose `relatedCases` include the Case ID;
4. if prerequisites exist, render a read-only gate without creating an Attempt;
5. let the learner open Foundation details or choose "Start case directly";
6. only then call the unchanged `createTrainingSession()`;
7. if no prerequisites exist, retain the current immediate-start behavior.

The Foundation source is fail-open for core training: if the optional bundled
Foundation layer cannot load at runtime, the existing Case training path remains
available. Content validation and build drift checks are responsible for
preventing that condition in a release.

## Error handling

- Invalid Foundation content fails validation and deterministic artifact checks.
- A missing Foundation detail ID renders the existing accessible empty/not-found
  pattern and links back to the Foundation overview.
- Missing active related Cases cannot pass content validation.
- Repository errors on Foundation pages use the existing `AsyncPage` retry
  pattern.
- Foundation loading errors never delete or rewrite user data and never block an
  existing in-progress Attempt.

## Testing

The implementation follows RED→GREEN cycles for:

- Foundation Schema completeness and unsafe-content rejection;
- duplicate ID, missing Skill, missing active Case, and wrong-directory checks;
- deterministic index generation and drift detection;
- `LocalFoundationSource` validation, caching, and immutability;
- progress-state and next-item derivation;
- Dashboard Foundation summary;
- overview/detail routing, content order, related Skills/Cases, and i18n;
- prerequisite gate zero-write behavior before confirmation;
- direct-start creation and matching-attempt resume behavior;
- Foundation → Case → Training → Debrief integration using bundled content.

Targeted Vitest suites, bounded content dry-runs, typecheck, lint, formatting,
and generated-artifact checks are run by Codex. The user runs the full test
suite and production build manually because the machine's safety rules reserve
full-suite/build execution for explicit Terminal control.

## Explicitly unchanged

- `ContentPack`, `ContentManifest`, and Content Pack checksum.
- `FdeCaseSchema` and all Case JSON.
- Training engine and reducer.
- Scoring and Mastery update algorithms.
- Attempt, Progress, Mastery, and Mistake record shapes.
- IndexedDB version, stores, repositories, and migrations.
- Existing user history and import/export semantics.
