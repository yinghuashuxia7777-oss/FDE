# Capability Constellation Visual Design

## Status

Approved by the user prompt on 2026-07-17. This is a UI-only refinement of
the existing Capability Map Showcase implementation.

## Goal

Turn the existing Capability Map from a text-heavy engineering component into
the primary brand visual of AI Growth OS: an AI Engineer Capability
Constellation.

## Frozen Contracts

The following must not change:

- `CapabilitySignal` and `CapabilityMapData` types
- `capability-map-data.ts`, including Demo values and real-evidence detection
- Mastery, Attempt, Repository, Skill, Case, Training, and Scoring contracts
- Dashboard data loading, readiness calculation, and signal selection
- Existing localized visible strings and all real-user priority behavior

## Design Read

This is a preserve-mode redesign for AI engineering learners. It uses the
current semantic color tokens, system font stack, Phosphor icon family, radius
scale, and light/dark/system themes. The visual language combines Apple-like
depth, Linear-like information clarity, and Vercel-like technical restraint.

- `DESIGN_VARIANCE: 6`
- `MOTION_INTENSITY: 3`
- `VISUAL_DENSITY: 6`

No new design system, dependency, image, SVG renderer, Canvas, or WebGL layer
is needed.

## Desktop Composition

The map remains a seven-node orbit around the existing AI Engineer center.
Each skill node becomes a vertically composed visual object:

1. circular Phosphor icon
2. semantic status ring
3. localized skill label
4. existing level and state line
5. existing evidence line

Nodes remain keyed and positioned by their existing signal order and stable
Skill IDs. A third orbit ring adds depth without changing data or order.
Connectors remain CSS pseudo-elements and become clearer through a restrained
tone gradient.

## Center Core

The center remains `AI Engineer` plus the existing `coreEvidence` string. It
uses a deep blue-black radial sphere, inner highlight, outer halo, and a code
icon from the existing Phosphor family. Demo continues to show 72% only because
the existing Dashboard passes that display value. Real mode continues to show
the existing real readiness or honest empty-state copy.

## Demo Presentation

When `badgeLabel` exists, the figure receives a presentation-only
`data-showcase="true"` marker. The existing Demo badge and source string gain
stronger typographic hierarchy. No profile metadata or value is added or
changed.

## State Styling

- `proficient`: existing success token
- `competent`: existing accent token
- `learning`: existing warning token
- `not-started`: existing muted token

Every state uses the same node structure. Color changes only the ring, icon,
connector, and status text. State meaning and labels remain unchanged.

## Motion

Motion exists only under `prefers-reduced-motion: no-preference`:

- node opacity establishes the constellation in a short stagger
- the center halo slowly changes scale and opacity to communicate an active
  capability core

Only opacity and transform animate. The global reduced-motion rule collapses
all animations to a single near-instant iteration.

## Responsive Behavior

At widths below 48rem:

- orbit rings and connectors are hidden
- the center becomes a compact horizontal summary and remains visible
- skill nodes become bordered horizontal list items
- icon rings, state colors, labels, and evidence remain readable

At widths up to 30rem, the existing single-column layout remains enforced.

## Testing

Tests must prove:

- Demo map still displays the same badge, profile string, readiness, and seven
  stable Skill nodes
- real evidence still hides Demo and preserves real status/readiness
- the visual component exposes only presentation markers and wrappers
- CSS defines three rings, status-ring glyphs, center halo, connectors,
  responsive list layout, and reduced-motion-safe animation
- no Repository write occurs during Demo rendering

## Scope Review

This specification contains no data, state, schema, route, dependency, or
application-layer change. It has no placeholders and requires no second design
exploration.
