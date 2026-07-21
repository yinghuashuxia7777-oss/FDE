# FDE Arena UI Design

> The approved visual direction is defined by
> `docs/superpowers/specs/2026-07-14-final-visual-upgrade.md`. This document
> records the resulting production UI contract; it is not an invitation to
> explore a different style.

## Design read

FDE Arena is a dark professional AI training system for career switchers and practicing FDEs. It should feel like a calm, high-end customer incident room: evidence is easy to scan, risk is explicit, and every action has a visible consequence. It must not look like a school quiz, generic SaaS admin template, marketing page, full-screen purple AI product, or neon cyberpunk interface.

## Design principles

1. Evidence before decoration. Logs, diffs, constraints, and confirmed facts receive the strongest information hierarchy.
2. One decision at a time. The current question and primary action are unmistakable.
3. Risk is semantic. Icon, label, copy, and color all communicate state.
4. Dense, not cramped. An 8-point grid and clear grouping preserve scanability.
5. Feedback teaches. Wrong answers explain the error class progressively without leaking the answer early.
6. Mobile changes hierarchy. It does not squeeze the desktop three-column layout.
7. Offline is honest. No remote fonts, images, telemetry, or runtime content requests.

## Design tokens

### Color

All components use semantic CSS variables rather than raw colors.

| Token | Light | Dark | Purpose |
|---|---|---|---|
| `--canvas` | `#F4F7FB` | `#07090D` | App background |
| `--surface` | `#FFFFFF` | `#10141D` | Primary surface |
| `--surface-subtle` | `#EDF2F8` | `#121826` | Grouped evidence and inactive controls |
| `--surface-raised` | `#FFFFFF` | `#141A2A` | Elevated cards |
| `--surface-inset` | `#E7EDF6` | `#080B12` | Immersive and evidence backgrounds |
| `--text` | `#0B1020` | `#F7F9FC` | Primary text |
| `--text-muted` | `#586579` | `#9EA8B7` | Secondary text |
| `--border` | `#D5DDEA` | `#20283A` | Separators and control outlines |
| `--accent` | `#2563EB` | `#3B82F6` | Selected, focus, primary action |
| `--accent-strong` | `#1D4ED8` | `#4F8CFF` | Active emphasis |
| `--accent-violet` | `#6D5CFF` | `#6D5CFF` | Local portal/path highlight only |
| `--success` | `#257A57` | `#46C98B` | Correct and complete |
| `--warning` | `#9A6700` | `#E7A93F` | Caution and second hint |
| `--danger` | `#B13A45` | `#F06F7B` | Wrong and destructive |
| `--critical` | `#7F1D2D` | `#FF8C98` | Critical error |
| `--focus` | `#005FCC` | `#75A7FF` | Keyboard focus ring |

Correctness never relies on red/green alone. Each state includes a text label and a consistent symbol.

### Typography

- UI: `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `PingFang SC`, `Noto Sans CJK SC`, sans-serif.
- Evidence and numbers: `ui-monospace`, `SFMono-Regular`, `Cascadia Code`, `Roboto Mono`, monospace.
- Scale: 12, 14, 16, 18, 22, 28, 36 px.
- Body starts at 16 px on mobile, line height 1.55. Dense metadata may use 12 or 14 px with AA contrast.
- Numeric dashboard values use tabular figures.

### Geometry and elevation

- Spacing: 4, 8, 12, 16, 24, 32, 48 px.
- Control radius 8–12 px; cards 16 px; Hero 24 px; pills only for compact filters/status.
- Borders organize dense data. Restrained shadows separate Hero, elevated cards, overlays, and the active decision panel.
- Layer scale: base 0, sticky 20, dropdown 40, modal 80, toast 100.

### Motion

- State feedback 140 ms, disclosure 200 ms, route content fade 220 ms.
- Animate only opacity and transform.
- Motion explains selection, disclosure, or route continuity; no decorative loops.
- `prefers-reduced-motion: reduce` reduces animation and transition durations to near-zero without exposing transform-hidden controls.

## Application shell

Desktop at 1024 px and above uses a stable 264 px sidebar, a compact top command bar with real Case search, and a content area capped at 1500 px. The sidebar contains Dashboard, Foundation, Cases, Skill map, Mistakes, Profile, and Settings. Training is reached through a Case and appears as an immersive route with a clear exit action.

Below 1024 px the sidebar becomes a drawer. A five-item bottom bar exposes Home, Cases, Training, Skills, and More. Secondary pages live under More. The global bar is hidden during active training to protect vertical space while retaining a visible back action.

## Page structure

### Dashboard

- The Hero presents the FDE growth promise, today-task CTA, Foundation CTA, and a locally rendered customer-incident decision scene.
- Today's recommendation is the primary Mission Card and remains driven by the existing recommendation engine.
- The growth rail shows the evidence-derived level, score-derived XP projection, streak, Skill radar, achievements, weak skills, and mistakes. It does not create new persisted progress fields.
- The three learning-path cards use real Foundation track progress.
- The fourteen-day calendar, training stats, achievements, and fourteen-domain overview derive only from Attempt, Progress, Mastery, and active content data.
- Empty state explains how the first case populates the dashboard.

### Foundation

- The library presents overall readiness, the next recommended concept, and three locally accented learning tracks.
- Cards preserve authored order, stable routes, current evidence status, level, and estimated time.
- Detail pages use a primary reading rail for the five authored chapters plus a responsive supporting rail for linked Skills and active Cases.
- Foundation status remains a projection of existing Skill Mastery and Case evidence; reading does not create a separate progress store.

### Case library

- Search and filters remain visible without dominating the page.
- Desktop uses a two-column asymmetric card list; mobile uses a single list.
- Cards show scenario, level, time, skills, score/result, and critical-risk status.
- Filter state is encoded in the URL and restored on back navigation.

### Training

- Desktop columns: scene 26%, evidence 40%, decision 34%.
- Scene contains customer context, constraints, confirmed facts, and timeline.
- Evidence uses tabs only when multiple evidence groups exist; logs/code/diffs scroll horizontally.
- Decision panel is sticky, contains progress, prompt, answer control, consequence summary, and one primary submit action.
- Mobile presents collapsible sections in the required order: scene, evidence, question, options. The current question is expanded by default and earlier context remains one tap away.
- Ordering and matching offer move-up/move-down and select-pair controls in addition to pointer drag.

### Debrief

- Begins with verdict, score, critical errors, and a concise interviewer-style assessment.
- A decision timeline compares actual and recommended paths.
- Every option explanation is available; incorrect evidence and priority mistakes are called out explicitly.

### Skill map and capability profile

- Fourteen domains use labeled status cells and numeric mastery.
- Detail views show evidence judgment, priority, risk, architecture, and communication dimensions.
- Charts always include a text/table alternative.

### Mistakes

- Filters cover domain, error type, and critical-only.
- Each row shows the selected answer, correct evidence, error reason, related skills, and prior retry results.

### Settings and data

- Theme: light, dark, or system.
- Export is a direct download with a local-data disclosure.
- Import validates before confirmation and reports incompatible fields.
- Clear progress is visually separated and requires a confirmation dialog.

## Component states

Every interactive component implements default, hover, focus-visible, active, disabled, loading, empty, and error states as applicable. Touch targets are at least 44 by 44 px. Route changes focus the main heading. Feedback uses `aria-live`; modal focus is trapped and restored.

## Responsive and accessibility acceptance

- Test widths: 375, 768, 1024, and 1440 px, plus phone landscape.
- No page-level horizontal scrolling; evidence blocks may scroll inside labeled regions.
- WCAG AA contrast, visible 2 px focus ring, semantic headings, skip link, and keyboard-complete flows.
- Icons are decorative only when adjacent text supplies the accessible name; no emoji serve as structural icons.
- Dynamic text at 200% remains operable and does not hide actions.
