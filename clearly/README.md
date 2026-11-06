# Clearly

Pool care app for Australian home pool owners. Test your water, get exact doses, get reminded at the right time.

Built with Expo (SDK 58), React Native, TypeScript and Expo Router.

> **Status:** dosing engine, local storage, the pool profile, the Test screen and the Plan screen (with dose follow-up reminders) are done. History, Settings, the full Home card and the scheduled test reminders come next.

## Setup

Needs Node 20 or later.

```bash
cd clearly
npm install
```

## Running

```bash
npm start          # Expo dev server, scan the QR code with Expo Go
npm run android    # open on an Android device or emulator
npm run ios        # open on an iOS simulator (macOS only)
npm run web        # quick check in a browser (storage uses localStorage there)
```

On first launch the app opens the pool profile so it has a volume and product strengths to dose against.

## Testing and checks

```bash
npm test           # Vitest, runs all dosing engine tests
npm run typecheck  # tsc --noEmit
npm run lint       # ESLint (eslint-config-expo)
npm run check      # all three
```

## Project layout

```
src/
  app/         Expo Router routes: index (interim Home), pool, test, plan
  notifications/  Local notification wrapper (no-op on web or without permission)
  components/  Shared UI: pill button, segmented control, stepper, number field, card
  engine/      Dosing engine: pure TypeScript, no React or Expo imports
  lib/         Pure helpers: volume calculator, number parsing, pool form logic
  state/       React context for the saved pool and test history
  storage/     Local storage: pool profile and test history repositories
  theme.ts     Palette, fonts, radii and spacing
```

ESLint blocks React and Expo imports inside `src/engine/`, so the engine stays reusable on web or a backend later.

## Storage

Everything is stored on the device with AsyncStorage. There is no backend in v1.

- `src/storage/kv.ts` defines a small key-value interface. The app uses AsyncStorage (`asyncStore.ts`); tests use an in-memory store, so storage logic is tested without native code.
- Each record is saved as `{ v, data }` so the format can change later with a migration instead of wiping history.
- **Pool profile** (`poolRepo.ts`): validated with the engine before saving. Missing product strengths in old saves fall back to defaults.
- **Test history** (`testsRepo.ts`): add, list (newest first), edit notes, delete. Readings are validated before saving. Unreadable entries are skipped rather than losing the rest.
- Corrupt or unreadable data never crashes the app: it's treated as "nothing saved".

## Pool profile

The pool screen sets volume, sanitiser (liquid, granular or salt), indoor or outdoor, and product strengths. Only the strengths that matter are shown (for example, granular strength for granular pools, dry acid purity if you use dry acid). Owners who don't know their volume can work it out from the size of a rectangle, round or oval pool, with shallow and deep end depths.

## Test screen

- Each reading starts as "Not tested". Tap **Add reading** to start it at the last test's value (or the ideal on the first test).
- Big − / + buttons step by test-kit resolution (FC 0.5, pH 0.1, TA and CYA 10). Hold to keep stepping, or tap the number to type it.
- A low / ideal / high bar shows where each value sits, with a short line underneath. The chlorine bar moves with the stabiliser reading. Lime is ideal, coral is adjust, and deep red is kept for act-now and safety cases (FC above 10, very low FC, pH below 7.0 or above 8.0), which use plain wording.
- Optional notes, a "Scan strip" placeholder marked coming soon, and a quick ripple on save.
- The interim Home shows the latest result (Crystal clear / Needs a tweak / Act now) and the readings.

## Plan screen

- Opens straight after saving a test (and from Home). Shows the status, any warnings (safety ones in red), then the steps in order.
- Each step has the product, the rounded amount, why, how, any side effects on other readings, and the wait before the next step.
- Steps are ticked off in order. After a step with a wait, the next one shows "Ready at 3:00 pm (6 h to go)" and its tick box unlocks when the wait is over. Only the most recent tick can be undone.
- Chlorine shows a "best done this evening" hint before 5 pm.
- Progress is saved, so closing the app mid-plan is fine. A new test starts a fresh plan.
- When everything is ticked: a small splash and "Clearly sorted", with when to retest.

### Dose follow-up reminders

Ticking a step that has a wait schedules a local notification for when it ends, e.g. "4 hours are up, ready for the chlorine?". Rules:

- Chlorine follow-ups move to 6 pm if the wait ends earlier in the day.
- Nothing fires in quiet hours (9 pm to 7 am for now; adjustable once Settings is built). A reminder that would land then moves to 7 am.
- Undoing a tick, finishing the plan or starting a new test cancels the pending reminder.
- Permission is only asked the first time a reminder is needed. Notifications don't run on web.

## Dosing engine

Entry point: `buildDosePlan(profile, readings)` in `src/engine/plan.ts`. It returns:

- `status`: `clear`, `tweak` or `act`
- `steps`: ordered doses, each with chemical, rounded amount, why, how, wait time and notes
- `warnings`: safety (shown in red, plain wording) and info
- `missing`: readings that weren't tested
- `errors`: input problems (no steps are given while there are errors)
- `targets`: the ranges used, for the low / ideal / high bands

### What it does

- **Targets** per the brief, with free chlorine scaling off stabiliser (min 7.5% of CYA, ideal 10%).
- **Order:** alkalinity (wait 6 h), pH (wait 4 h), stabiliser (skimmer sock, retest in a week), chlorine last in the evening.
- **pH after bicarb** is recalculated with the chemistry model before deciding on a pH dose.
- **Acid and soda ash** come from a carbonate equilibrium model (pK1 6.3, pK2 10.25, pKw 14.0). Carbonate alkalinity is TA − CYA ÷ 3 and total carbonate is held constant. Soda ash is solved numerically.
- **Rounding** to measurable amounts: steps of 5 under 50, 10 under 500, 50 above, switching to L or kg at 1000.
- **High stabiliser** gives a drain-and-refill percentage and holds off other doses until a retest.
- **Missing readings** are listed. A pH dose isn't given without an alkalinity reading. If stabiliser wasn't tested, the maths assumes the ideal for the pool and says so.
- **Validation:** pH 6 to 9, FC 0 to 30, TA 0 to 400, CYA 0 to 300.

### Choices made beyond the brief

- **Cyanurate buffering** (pKa 6.88) is added to the acid and soda ash model. As pH drops, some cyanurate takes up acid too. Without it, the brief's pH 7.9 case comes out around 70 mL; with it, about 110 mL, which is closer to what pool owners see in practice. The model still reproduces the measured TA at the current pH, so TA − CYA ÷ 3 holds.
- **Chlorine is dosed only when FC is below the minimum**, and raised to the ideal.
- **Status `act`** when FC is above 10 ppm or below half the minimum, or pH is below 7.0 or above 8.0.
- **Indoor pools** (ideal CYA 0) with high stabiliser drain to half the maximum rather than 100%.
- **Salt pools** are topped up with liquid chlorine plus a prompt to check the chlorinator.

### Reference results (9,600 L outdoor liquid pool, 12.5% chlorine, 32% acid)

| Readings | Plan |
|---|---|
| FC 4, pH 7.4, TA 80, CYA 40 | No steps, all good |
| FC 1, others ideal | 230 mL liquid chlorine |
| TA 40, pH 7.0, FC 0.5 | 650 g bicarb, then 270 mL chlorine |
| CYA 10 | 290 g stabiliser |
| CYA 100 | Drain about 60% |
| pH 7.9, TA 80 | 110 mL hydrochloric acid |

## Disclaimer

Doses are guidance based on the readings entered. Always follow the product label, and check with a pool professional if unsure.
