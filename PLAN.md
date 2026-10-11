# Chore Heroes — Plan

Tablet-first (iPad, portrait + landscape) chore & reward app for children aged 6–9,
built with Expo SDK 57 / React Native / TypeScript (strict) / expo-router. Also builds
as an Android APK/AAB from the same codebase. Local-first, no network, no accounts.

## Architecture

```
┌──────────────────────────── UI (expo-router screens, src/app) ─────────────────────┐
│ child flows (no text required)      │ parent flows (PIN + math gate)               │
└───────────────┬─────────────────────┴───────────────┬──────────────────────────────┘
                │ hooks (useQuery / useMutation)      │
┌───────────────▼─────────────────────────────────────▼──────────────────────────────┐
│ services (src/services): repositories — children, tasks, instances, rewards,       │
│ redemptions, ledger, badges, settings, export/reset. All writes go through here.   │
├────────────────────────────────────────────────────────────────────────────────────┤
│ domain (src/domain): pure logic — dates, recurrence, streaks, badges, balances,    │
│ redemption rules, PIN hashing, math gate. 100% unit tested, no I/O.                │
├────────────────────────────────────────────────────────────────────────────────────┤
│ db (src/db): Db interface + migrations. expo-sqlite adapter in the app,             │
│ node:sqlite adapter in Jest so repositories are tested against real SQLite.        │
└────────────────────────────────────────────────────────────────────────────────────┘
State: Zustand — settings (persisted to SQLite), session (parent unlock, today key),
data version counter (bumped after every write so screens re-query).
Feedback layer: speech (expo-speech), sounds (expo-audio), haptics (expo-haptics),
animation (react-native-reanimated, disabled when reduce-motion is on).
```

## Folder structure

```
src/
  app/                 expo-router routes only
    _layout.tsx        root: fonts, DB init/migrations, providers, midnight ticker
    index.tsx          redirect → /setup or /kids
    setup.tsx          first-run wizard (PIN → children)
    kids.tsx           child profile picker
    kid/[childId]/     index (Today), shop, progress
    parent-unlock.tsx  PIN pad
    parent/            _layout (guard), index (hub/dashboard), inbox, tasks, task-edit,
                       rewards, reward-edit, children, child-edit, child/[childId],
                       settings (math gate), change-pin
  components/          design-system primitives + feature components
  db/                  Db interface, expo adapter, migrations
  domain/              pure logic + catalogs (task/reward templates, badges, avatars)
  services/            repositories (DB-backed use cases)
  state/               Zustand stores
  hooks/               useQuery, useToday, useLayout, useFeedback …
  theme/               tokens: colors, spacing, radii, typography
__tests__/             (co-located as *.test.ts(x) next to sources)
```

## Data schema (SQLite, migration v1)

| table               | columns                                                                                                                                                                                    | notes                                                                                                                |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| `schema_migrations` | version PK, applied_at                                                                                                                                                                     | migration bookkeeping                                                                                                |
| `settings`          | key PK, value (JSON)                                                                                                                                                                       | sound, voice, reduce motion, font, reminder, PIN hash/salt                                                           |
| `children`          | id, name, avatar, age, color, sort_order, created_at, archived_at                                                                                                                          | 1–6 active                                                                                                           |
| `tasks`             | id, title, icon, stars(1–5), schedule_type(once/daily/weekdays/weekly), weekdays(CSV 0–6), start_date, needs_approval, created_at, updated_at, archived_at                                 |                                                                                                                      |
| `task_assignments`  | task_id, child_id (PK both)                                                                                                                                                                | many-to-many                                                                                                         |
| `task_instances`    | id, task_id, child_id, period_key, title, icon, stars (snapshots), status(todo/waiting/done), completed_at, decided_at, parent_note, created_at; **UNIQUE(task_id, child_id, period_key)** | one row per child per due day (per week for weekly; per task for one-time) → history preserved, no double completion |
| `rewards`           | id, title, icon, cost, weekly_limit NULL, needs_approval, created_at, updated_at, archived_at                                                                                              |                                                                                                                      |
| `redemptions`       | id, reward_id, child_id, title, icon, cost (snapshots), status(requested/approved/rejected), week_key, requested_at, decided_at, parent_note                                               |                                                                                                                      |
| `stars_ledger`      | id, child_id, delta, reason, source_type, source_id, created_at                                                                                                                            | **append-only** (SQLite triggers abort UPDATE/DELETE); balance = SUM(delta)                                          |
| `badges_earned`     | child_id, badge_id, earned_at, seen                                                                                                                                                        | PK(child_id, badge_id)                                                                                               |

Ledger rules: stars are credited when a task is done (or approved). A reward request debits
the cost immediately (so balance can never go negative and double-spending is impossible);
a rejection appends a refund row. Manual adjustments require a reason and cannot make the
balance negative.

## Screens

Child (icon-first, spoken, ≥64pt targets): Profile picker → Today (task cards, Done row,
star jar, streak) → Rewards shop → Progress (streak flame + badges).
Parent: PIN unlock → Hub (per-child summary, inbox badge) → Inbox, Tasks (+ editor with
20+ templates), Rewards (+ editor with 12+ templates), Children, Child dashboard (weekly
chart, adjust stars), Settings (math gate: toggles, reminders, change PIN, export, reset).

## Milestones

- (a) Scaffold, design system, navigation skeleton
- (b) DB, migrations, ledger, domain logic + unit tests
- (c) Parent flows
- (d) Child flows
- (e) Badges, streaks, sound, voice, animation
- (f) Tablet layout polish + accessibility pass
- (g) EAS config + docs (README, BUILD, PRIVACY)
