# AI Growth OS Beta Productization

## Product decision

Make the existing sidecar content executable without introducing a second
database or changing the training write model. Practice completion evidence is
session-scoped React state. It can immediately update read-only capability
views, but it is intentionally cleared on refresh and never claims durable
Mastery.

## User journeys

### Practice

`/practices` lists focused activities. `/practices/:practiceId` resolves the
authored Concept, Leaf Skill, difficulty, prompt and output contract. A user
submits one text response. A deterministic local rule checks length, required
reasoning structure and authored keywords, then emits a session evidence item.

### Project

`/projects` lists three authored templates. `/projects/:projectId` shows three
milestones, required Skills, deliverables and related evidence. Progress is a
read-only projection over session Practice evidence and completed attributed
Cases; no Project completion record is persisted.

### Public profile

`/profile/demo` is a static, repository-independent presentation of the Demo
Engineer. It never reads or writes local user data.

## Content expansion

- MVP Catalog grows from 30 to 40 reviewed Leaves.
- Every new Leaf receives a draft Rubric and focused Practice.
- Attribution covers all 50 active Case IDs with exact active versions and one
  primary category allocation: Software 10, AI Application 15, Agent 10,
  Production 10, FDE 5.

## Boundaries

Legacy Skill, Foundation, Concept, Case, Attempt, Mastery, IndexedDB and the
Dashboard information architecture remain unchanged. New UI is additive.
