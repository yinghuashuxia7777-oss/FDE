# Active Dashboard Depth Design

## Goal

Make the real, data-populated Dashboard read as a layered AI Engineer growth workspace rather than a flat card grid, while preserving every existing module, route, calculation, and responsive breakpoint.

## Approved Direction

The active Dashboard uses three visual depths:

1. **Atmosphere:** a pale blue-gray canvas with restrained radial light and oversized engineering-orbit rings.
2. **Capability stage:** the Capability Map is the central elevated surface; Journey, Readiness, and Mentor remain quieter support surfaces.
3. **Action foreground:** Today's Growth Mission, Today's Challenge, and Evidence Timeline sit closest to the user with the strongest soft shadow and small static vertical lift.

The signature is the existing capability orbit appearing to illuminate the surrounding workspace. The interface must not become a poster replica or introduce decorative content unrelated to capability growth.

## Visual System

- Canvas: existing `--color-canvas`, enriched only inside the active Dashboard.
- Surfaces: existing surface tokens with partial transparency and backdrop blur.
- Borders: lower-contrast mixed borders; shadows carry depth instead of outlines.
- Depth 1: `--shadow-card`, no lift.
- Depth 2: `--shadow-float`, `translateY(-0.25rem)`.
- Depth 3: `--shadow-float-front`, `translateY(-0.5rem)`.
- Motion: no continuous card movement. Fine-pointer hover may add at most `0.125rem` of lift; reduced-motion users receive static depth only.

## Layout

```text
Atmospheric canvas / orbit rings

  [ Today's Growth Mission -- foreground ]

  [ Journey ] [ Capability Map -- stage ] [ Mentor ]
  [ Readiness] [ Capability Map -- stage ] [ Evidence -- foreground ]

  [ Today's Challenge -- foreground ]
```

Existing grid areas and DOM order remain unchanged. Layering is achieved with active-mode selectors, z-index, soft overlap, and surface treatment rather than new components.

## Responsive Behavior

- Desktop keeps the existing two- and three-column layouts.
- Tablet keeps the current grid but reduces negative overlap.
- Mobile removes negative margins and transforms so cards remain a readable single-column flow.
- Focus visibility and reduced-motion behavior remain intact.

## Boundaries

- No changes to Dashboard data flow, Mastery, evidence, Attempt, IndexedDB, routes, or content.
- No new dependencies, images, canvas renderer, animation library, or design system.
- New-user `FirstLoopPreview` remains unchanged except for inheriting the shared shadow tokens.

## Verification

- CSS contract test proves the active Dashboard has atmosphere, a central capability stage, and foreground action surfaces.
- Existing Dashboard component tests remain green.
- Full Vitest, TypeScript, ESLint, Build, content validation, and browser critical paths pass.
