# Task 5 Report — Homepage and global Academy entry points

## Status

DONE_WITH_CONCERNS

Implemented the Task 5 scope only:

- Chinese `DashboardHero` Academy action before the existing engineering challenge action
- Existing challenge destination and `bb-btn bb-btn--primary` behavior retained
- Existing capability action retained as the third Hero action
- Chinese desktop Academy destination immediately after Evidence
- Chinese workspace and mobile More drawer Academy destinations
- Complete omission of Academy navigation/actions from `en-US`
- `nav.academy` dictionary parity for zh-CN and en-US

No Task 6 CSS, Academy visual-system work, protected domain logic, dependency, Challenge selection, or daily-mission computation changes were made.

## Commit

Pending at report creation; final commit hash is reported by the task handoff.

Not pushed.

## Files

- `src/pages/dashboard/DashboardHero.tsx`
- `src/components/layout/ApplicationShell.tsx`
- `src/components/layout/MobileNavigation.tsx`
- `src/app/App.test.tsx`
- `src/components/layout/MobileNavigation.test.tsx`
- `src/i18n/translations/shell-settings.ts`

## Behavior and boundaries

- `DashboardHero` reads `language` from the shared i18n context and renders `进入 AI 学院` only for `zh-CN`.
- Hero actions are ordered Academy, engineering challenge, capability; the challenge still uses its existing computed `primaryTo` and primary class.
- `ApplicationShell` builds desktop and workspace destination arrays after reading `language`; the desktop Academy item follows Evidence exactly.
- `MobileNavigation` builds its drawer destination array after reading `language`; the Academy route also participates in the More active-route calculation in Chinese.
- English destination arrays never include `/academy`, and the English Hero never renders an Academy action.
- The pre-existing App shell assertion for the default theme was corrected from stale `system` to the current `ThemeProvider` baseline `dark`, with parent-task approval.

## TDD evidence

RED:

- Added the Academy entry-point tests before production changes.
- `npm run test:run -- src/app/App.test.tsx src/components/layout/MobileNavigation.test.tsx -t Academy`
- Result before implementation: Chinese Hero, desktop, workspace, and mobile drawer Academy assertions failed because the links did not exist; the English mobile isolation assertion already passed.

GREEN:

- `npm run test:run -- src/app/App.test.tsx src/components/layout/MobileNavigation.test.tsx -t Academy`
- Result after implementation and selector correction: Academy behavior tests passed.
- Full required test command: 25/25 passed.

Coverage includes Hero ordering and Challenge class/destination retention, desktop Evidence adjacency, workspace presence, mobile drawer presence, and English omission across Hero, desktop, workspace, and mobile drawer.

## Verification

- `npm run test:run -- src/app/App.test.tsx src/components/layout/MobileNavigation.test.tsx`: PASS, 25/25.
- `npm run typecheck`: PASS.
- `npm run test:run -- src/i18n/coverage.test.ts -t "parity|literal translation key"`: PASS, 2/2 selected checks.
- `npx prettier --check` on all Task 5 source/test/i18n files: PASS.
- `git diff --check`: PASS.
- `npm run build`: PASS, including content quality, generated-content drift checks, knowledge v2 validation/schema checks, TypeScript, Academy validation (25 Topics / 7 Tools), and Vite production build.

## Concerns

1. Repository-wide ESLint still reports the pre-existing `react-hooks/set-state-in-effect` finding in `DashboardHero.tsx` at its boot-animation reset. Task 5 does not alter that animation/effect behavior; Task 5 test lint findings were corrected.
2. Full i18n coverage already reports Dashboard-family Chinese/direct-copy debt. Task 5 uses the required Chinese-only `进入` prefix together with translated `nav.academy`; dictionary parity and literal translation-key coverage pass.
3. Vite retains the existing warning that the main chunk exceeds 500 kB after minification; build exits successfully.
4. The user-provided untracked Academy plan/spec files remain untouched and uncommitted.
