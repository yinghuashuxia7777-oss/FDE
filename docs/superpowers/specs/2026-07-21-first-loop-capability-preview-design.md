# First-Loop Capability Preview Design

## Objective

Keep the existing first-time setup and First Mission, while showing a new learner what one complete growth loop will unlock. The original capability orbit remains the visual destination instead of disappearing until evidence exists.

## Approved Direction

Use a truthful hybrid preview:

- all capability signals remain in their real, unverified state;
- no demo readiness, score, completed Case, or fabricated evidence appears;
- the parent capability associated with the first daily growth loop is highlighted as “unlocks after the first loop”;
- completing real Practice and Case work continues to feed the existing Evidence, Mastery, and Capability projections without any alternate state system.

## Information Hierarchy

The new-user surface borrows the reference images’ layered editorial hierarchy without copying their poster layout:

1. Existing onboarding/profile setup remains the primary interactive layer.
2. A large “what your first loop unlocks” heading establishes the outcome.
3. A floating `+1 capability evidence` result tile provides a clear reward target.
4. A translucent Learn → Practice → Challenge → Evidence workflow deck explains how the reward is earned.
5. The existing capability orbit sits behind and below the workflow deck, with one pending node highlighted.
6. A disclaimer states that the preview is not evidence and does not affect Mastery.

## Visual Principles

- Preserve the current AI Growth OS dark visual identity.
- Add depth with restrained negative margins, translucent surfaces, borders, shadows, and background rings.
- Keep one primary action: the existing First Mission action.
- Use the pending highlight only for the first-loop target; verified mastery colors retain their existing meaning.
- Collapse the workflow and result tile cleanly on narrow screens.
- Respect reduced-motion preferences.

## Data Boundaries

- No new schema, storage, database, or persistence.
- No changes to Attempt, Mastery, IndexedDB, Skill, Practice, or Case contracts.
- Build the blank orbit with the existing real capability projection.
- Select the highlighted parent capability from the existing daily mission `evidenceSkillId` and MVP Leaf Skill catalog.
- Demo Profile data remains isolated and is never used in the new-user preview.

## Acceptance Criteria

- A first-time user sees the original capability orbit below onboarding.
- Exactly one relevant capability node is visually marked as a pending first-loop unlock.
- The pending node has no score and remains `not-started`.
- The preview shows Learn, Practice, Challenge, and Evidence titles sourced from existing content.
- No Demo Profile label, 72% readiness, or fabricated completed evidence appears.
- Existing active-user Dashboard behavior is unchanged.
- TypeScript, ESLint, Vitest, and production build pass.
