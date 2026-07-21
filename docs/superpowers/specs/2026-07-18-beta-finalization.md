# AI Growth OS Beta Finalization Design

## Scope

Close the existing local-first Beta loop without changing stable IDs, Attempt,
Mastery, or the IndexedDB architecture. This is a freeze-preparation change,
not a platform expansion.

## Data boundaries

Three versioned `localStorage` sidecars remain independent from repositories:

- `practice-completions:v1`: passed rule evaluation plus submitted artifact.
- `project-evidence:v1`: three user-controlled milestone flags per project.
- `feedback:v1`: category, message, route context, and timestamp.

Every read validates the complete array and fails closed to an empty view. A
storage write failure leaves the current React session usable. Demo Profile is
compile-time display data and never reads these sidecars.

## Experience

The existing Dashboard Journey gains a single Start Journey action and retains
its current structure. Practices persist passed evidence. Project detail records
Architecture, Evaluation, and Deployment. Feedback is accessible from the
workspace menu. `/profile/demo` adds an explicit Capability Map and Growth
Journey while remaining isolated.

## Non-goals

No backend, identity, AI API, synchronization, migration, project management,
Mastery mutation, Attempt mutation, or Skill Graph redesign.
