# FDE Arena UI Design

## Design read

FDE Arena is a dense engineering training workspace for career switchers and practicing FDEs. It should feel like a calm incident room: evidence is easy to scan, risk is explicit, and every action has a visible consequence. It must not look like a school quiz, a generic admin template, or a neon AI product.

The primary UI skill is `ui-ux-pro-max`. Design dials are variance 5/10, motion 3/10, and density 8/10. `design-taste-frontend` contributed anti-template checks but is not used as the main system because it explicitly excludes dense dashboards.

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
| `--canvas` | `#F3F5F7` | `#0F141A` | App background |
| `--surface` | `#FFFFFF` | `#171E26` | Primary surface |
| `--surface-subtle` | `#E9EDF1` | `#202A35` | Grouped evidence and inactive controls |
| `--text` | `#17202B` | `#F1F5F8` | Primary text |
| `--text-muted` | `#566273` | `#AAB5C2` | Secondary text |
| `--border` | `#CDD5DE` | `#384554` | Separators and control outlines |
| `--accent` | `#176B87` | `#5AB3CE` | Selected, focus, primary action |
| `--accent-strong` | `#0D526A` | `#82CCE0` | Active emphasis |
| `--success` | `#257A57` | `#62C695` | Correct and complete |
| `--warning` | `#9A6700` | `#E6B84C` | Caution and second hint |
| `--danger` | `#B13A45` | `#F27D87` | Wrong and destructive |
| `--critical` | `#7F1D2D` | `#FF9AA5` | Critical error |
| `--focus` | `#005FCC` | `#8CC8FF` | Keyboard focus ring |

Correctness never relies on red/green alone. Each state includes a text label and a consistent symbol.

### Typography

- UI: `system-ui`, `-apple-system`, `BlinkMacSystemFont`, `Segoe UI`, `PingFang SC`, `Noto Sans CJK SC`, sans-serif.
- Evidence and numbers: `ui-monospace`, `SFMono-Regular`, `Cascadia Code`, `Roboto Mono`, monospace.
- Scale: 12, 14, 16, 18, 22, 28, 36 px.
- Body starts at 16 px on mobile, line height 1.55. Dense metadata may use 12 or 14 px with AA contrast.
- Numeric dashboard values use tabular figures.

### Geometry and elevation

- Spacing: 4, 8, 12, 16, 24, 32, 48 px.
- Control radius 8 px; panels 12 px; pills only for compact filters/status.
- Borders organize dense data; shadows are reserved for overlays and the active decision panel.
- Layer scale: base 0, sticky 20, dropdown 40, modal 80, toast 100.

### Motion

- State feedback 140 ms, disclosure 200 ms, route content fade 220 ms.
- Animate only opacity and transform.
- Motion explains selection, disclosure, or route continuity; no decorative loops.
- `prefers-reduced-motion: reduce` removes transforms and reduces durations to near-zero.

## Application shell

Desktop at 1024 px and above uses a stable 240 px sidebar, a compact top context bar, and a content area capped at 1500 px. The sidebar contains dashboard, cases, skill map, mistakes, profile, and settings. Training is reached through a case and appears as an immersive route with a clear exit action.

Below 1024 px the sidebar becomes a drawer. A five-item bottom bar exposes Home, Cases, Training, Skills, and More. Secondary pages live under More. The global bar is hidden during active training to protect vertical space while retaining a visible back action.

## Page structure

### Dashboard

- Training recommendation is the primary action.
- A compact metric strip shows completed cases, streak, pass rate, and critical risks.
- The fourteen-domain overview uses labeled segmented cells, not decorative gauges.
- Weak skills and recent mistakes use ranked lists with direct actions.
- Empty state explains how the first case populates the dashboard.

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

