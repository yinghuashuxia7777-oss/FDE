# AI Growth OS Beta Release

Release date: 2026-07-21
Repository: `yinghuashuxia7777-oss/FDE`
Production branch: `main`

## Release Capability

- Evidence-based AI Engineer growth loop:
  `Knowledge → Practice → Case → Evidence → Capability → Project → Profile`.
- State-aware first experience with goal, experience level, growth profile, and First Mission.
- Seven-day Starter Journey and daily growth mission projection.
- Capability Map and Profile explanations based on existing evidence.
- Local Practice, Project, and Feedback sidecars.
- Isolated public Demo Profile.
- Chinese and English product UI.

## Data Boundaries

- Mastery and Attempt contracts remain unchanged.
- IndexedDB architecture remains unchanged.
- Practice and Project evidence do not mutate Mastery.
- Demo data does not enter user repositories or local evidence.
- No Backend, account, cloud synchronization, analytics, or AI API is included.

## Release Validation

The final commit records fresh results for:

- TypeScript
- ESLint
- Prettier
- Vitest
- Playwright smoke tests
- Production build
- Content quality and index drift
- V2 validation and schema drift
- GitHub CI
- Cloudflare public deployment

## Known Limitations

- User data is browser- and device-local.
- Practice evaluation is deterministic and rule based.
- Public Profile is currently an isolated static product showcase.
- The main JavaScript bundle remains above Vite's 500 kB warning threshold.
