# Capability Map Showcase Mode Design

## Approval and scope

The user supplied the complete product design and explicitly requested direct implementation. This document records that approved design; it does not open a second design-review round.

The change is limited to the Dashboard Capability Map. It must not change Capability Profile, Mastery calculation, Attempt records, repositories, IndexedDB, Case, Training, Scoring, Mentor, Readiness Card, or Evidence Timeline.

## Product outcome

A learner with no real capability evidence sees an explicitly labeled example profile that demonstrates the full seven-node AI Engineer map. As soon as any real capability evidence exists, the example disappears and the map uses only real records.

Demo values are presentation fixtures. They never become user records and never participate in progress, recommendations, readiness calculation, mastery, or evidence history.

## Selected architecture

Create `src/pages/dashboard/capability-map-data.ts` as a pure presentation-data provider beside the Dashboard UI.

```text
SkillMasteryRecord + AttemptRecord
              |
              v
   hasRealCapabilityEvidence
        /               \
       v                 v
real signal builder   demo signal builder
        \               /
         v             v
          CapabilitySignal[]
                  |
                  v
          CapabilityMapCard
```

The provider consumes records already loaded by `DashboardPage`; it does not receive repositories and cannot write state. `CapabilityMapCard` renders localized `CapabilitySignal[]` and optional presentation labels without knowing whether records came from real or Demo data.

Rejected approaches:

- Repository seeding or a fake user: rejected because it would contaminate user evidence.
- Demo branching inside `CapabilityMapCard`: rejected because it would couple the view to data-source policy.
- Application-layer provider: rejected because the signal is Dashboard presentation data and includes localized UI copy.

## Real-evidence priority

The exact gate is:

```ts
mastery.some(({ sampleCount }) => sampleCount > 0) ||
  attempts.some(({ status }) => status === 'completed');
```

The provider must receive all loaded Attempt and Mastery records, before published-case or active-skill filtering.

- A score of `0` with `sampleCount: 1` is real evidence.
- A completed Attempt for a hidden or deprecated Case is real evidence.
- An in-progress or abandoned Attempt alone is not completed evidence.
- A zero-sample Mastery record alone is not evidence.

If the mode is real but active-skill readiness is unavailable, the center says `Start building capability proof` / `开始建立能力证明`. It never falls back to the Demo readiness.

## Capability signals

The Map uses the existing seven stable Skill IDs:

1. `llm.applications`
2. `agents.evaluation`
3. `rag.search`
4. `software.foundations`
5. `cloud.deployment`
6. `systems.networking`
7. `reliability.observability`

`CapabilitySignal` carries fully prepared presentation labels:

```ts
interface CapabilitySignal {
  confidence: string;
  evidence: string;
  label: string;
  level: number;
  mastery: 'not-started' | 'learning' | 'competent' | 'proficient';
  score: number | undefined;
  skillId: string;
  sourceLabel: string;
  statusLabel: string;
}
```

The core Mastery algorithm remains unchanged. For this Map only, the existing `Weak` result is presented as `learning`; no score or sample is altered.

## Demo profile

The local constant is explicitly named `Alex Chen`, targets `Production AI Engineer`, and has showcase readiness `72`. Its signals use only the seven stable IDs above:

| Capability | Score | Level | State | Confidence | Evidence |
| --- | ---: | ---: | --- | --- | ---: |
| LLM applications | 85 | 4 | proficient | high | 12 |
| Agent evaluation | 72 | 3 | competent | medium | 8 |
| RAG and search | 80 | 4 | proficient | high | 10 |
| Software foundations | 75 | 3 | competent | high | 9 |
| Cloud deployment | 60 | 3 | competent | medium | 6 |
| Systems and networking | 45 | 2 | learning | medium | 4 |
| Reliability | 40 | 2 | learning | low | 3 |

The Capability Map title displays an explicit `Demo Profile` / `示例档案` badge and the source line identifies the example profile. The `72%` center value is therefore never presented as the learner's result.

## Visual states

- `not-started`: gray-blue, `Not verified`, and `Complete challenges to build evidence`; no `No evidence` or `0 samples` string.
- `learning`: warning orange, `Learning`, and a localized training-sample count.
- `competent`: existing blue accent, `Competent`, and a localized trusted-evidence count.
- `proficient`: existing success green, `Proficient`, and a localized engineering-evidence count.

The existing orbit, two rings, seven positions, radius system, semantic theme tokens, mobile two-column collapse, dark mode, and reduced-motion behavior remain intact. No new dependency or animation is added.

## Localization

All new visible strings live in the existing zh-CN and en-US dictionaries. English singular and plural evidence forms have separate keys. No production TSX hardcodes visible Demo copy.

## Verification

Tests must prove:

- Demo appears only with zero sampled Mastery and no completed Attempt.
- Any positive sample count or completed Attempt selects real mode.
- Historical/deprecated completed Attempts also select real mode.
- Demo has seven stable IDs and showcase readiness 72.
- Demo changes only Capability Map; real Readiness and Evidence Timeline stay empty for a new learner.
- A real zero score remains real and renders 0% rather than 72%.
- A completed Attempt without active Mastery shows the honest real empty center.
- Rendering Demo calls no repository mutator.
- Both languages and all four visual states are covered.

Final gates are focused Vitest, full Vitest, TypeScript, ESLint, production build, scoped formatting, and `git diff --check`.
