# Project status

_Updated: 11 October 2026_

## Done ✅

- **(a) Scaffold** — Expo SDK 57, TypeScript strict, expo-router, ESLint + Prettier, Jest +
  React Native Testing Library, design tokens, component library, Sparky mascot, app icons.
- **(b) Data & domain** — SQLite schema v1 with migrations runner, append-only stars ledger
  (DB triggers), per-period task instances, recurrence (one-time / daily / weekdays / weekly),
  midnight + time-zone handling, redemptions with weekly limits, approvals, streaks, badges,
  PIN hashing + lockout, math gate, export, full reset.
- **(c) Parent flows** — setup wizard, PIN unlock (+ forgot-PIN recovery), hub, approvals
  inbox with notes, jobs and rewards CRUD with templates and archive/restore, children
  management, per-child dashboard with weekly chart and star adjustments, settings (math gate):
  sound, voice, reduce motion, dyslexia font, daily reminder, change PIN, export, erase.
- **(d) Child flows** — hero picker, Today board (to do / waiting / done, same-day undo),
  rewards shop with "ask a grown-up" confirmation, progress page.
- **(e) Delight** — celebration burst, generated sounds, haptics, read-aloud everywhere,
  streak flame, 10 badges with unlock animation, star jar.
- **(f) Tablet & accessibility** — two-pane landscape layouts, width-based grids, 64pt+
  child targets, Dynamic Type with caps, reduce-motion (system + app), OpenDyslexic,
  accessible labels on every control.
- **(g) Release setup** — `eas.json` (development / preview APK / production), `app.json`
  (all orientations, `supportsTablet`), release builds without Android network permissions,
  README, BUILD, PRIVACY, DECISIONS.
- **Quality pass** — code-review skill over the whole branch; all 10 findings fixed (see
  DECISIONS.md #58–66).

## Verification performed (in the cloud sandbox, no device)

| Check                                                                                                  | Result                                                                                                                                                                                                                                                                                   |
| ------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck` (tsc strict)                                                                       | ✅ 0 errors                                                                                                                                                                                                                                                                              |
| `npm run lint` (ESLint + Prettier, max-warnings 0)                                                     | ✅ 0 problems                                                                                                                                                                                                                                                                            |
| `npm test`                                                                                             | ✅ 13 suites, 79 tests — domain logic, repositories against real SQLite (node:sqlite), migrations, components                                                                                                                                                                            |
| `npx expo export --platform web`                                                                       | ✅ bundles                                                                                                                                                                                                                                                                               |
| Web smoke test in headless Chromium (`scripts/smoke`) at iPad portrait 820×1180 and landscape 1180×820 | ✅ 26 screens each, full flow (setup → kid jobs → celebration/badges → shop → progress → parent PIN → dashboard + adjustment → job editor → rewards → settings gate → dyslexia font → approval job → reward request → approvals inbox → erase all → back to setup), **0 console errors** |
| `npx expo prebuild` (iOS + Android, production variant)                                                | ✅ all config plugins apply; manifest/Info.plist checked (orientations, blocked permissions, no microphone)                                                                                                                                                                              |
| `npx expo-doctor`                                                                                      | ✅ 19/21; the 2 remaining checks need the Expo API, which is blocked in this sandbox                                                                                                                                                                                                     |

## Needs verification on real hardware ⚠️

These could not be exercised without a device/simulator:

- Text-to-speech voices and timing (expo-speech), sound playback and silent-switch behaviour
  (expo-audio), haptics.
- Local daily reminder permission prompt and delivery (expo-notifications).
- Share sheet export (expo-sharing / expo-file-system) to Files, AirDrop, e-mail.
- VoiceOver / TalkBack reading order and labels; largest Dynamic Type / font scale sizes.
- iPad rotation, Split View / Slide Over sizes, Android tablet layouts.
- Animation smoothness (Reanimated 4 on the new architecture) and the reduce-motion system
  setting on iOS/Android.
- PIN hashing speed on low-end Android (2,000 SHA-256 rounds in JS; expected ≈100–300 ms).
- Midnight rollover while the app stays open overnight; time-zone change while running.
- First EAS cloud builds (credentials, signing) — see BUILD.md.

## In progress

Nothing — all planned milestones are complete.

## Next (suggested)

1. Owner: change bundle identifiers, `eas init`, first `preview` Android build and iOS
   TestFlight build (BUILD.md).
2. Device test pass using the checklist above; record findings here.
3. Nice-to-haves: data **import** (restore from an export), a date picker for one-time jobs
   (currently Today/Tomorrow), per-child reward visibility, custom reward approval notes,
   localization (copy is English only), app-store screenshots.

## Known issues / limitations

- One-time jobs can be scheduled for Today or Tomorrow only (no date picker yet).
- Export only; there is no import/restore yet.
- Forgot-PIN recovery relies on a hard math gate (no accounts exist to recover with); a
  determined older sibling could pass it.
- The iOS build includes the `aps-environment` entitlement added by the expo-notifications
  plugin even though only local notifications are used.
- Web is a smoke-test target only (expo-sqlite web is alpha); don't ship the web build.
- Jest prints Node's "SQLite is an experimental feature" warning (harmless).
- `npx expo-doctor` schema / React Native Directory checks should be re-run with internet access.
