# Clearly

Pool care app for Australian home pool owners. Test your water, get exact doses, get reminded at the right time.

Built with Expo (SDK 58), React Native, TypeScript and Expo Router.

> **Status:** all v1 screens are built: Home, Test, Plan, History and Settings, with local storage, all three reminder types and sun mode. What's left for v1 is a run on a real phone in Expo Go; see [PHONE-TEST.md](PHONE-TEST.md).

## Setup

Needs Node 20 or later.

```bash
cd clearly
npm install
```

## Running

```bash
npm start          # Expo dev server, scan the QR code with Expo Go
npx expo start --tunnel  # if your phone can't reach your computer on the same network
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
  app/         Expo Router routes: index (Home), pool, test, plan, history, settings
  notifications/  Local notification wrapper (no-op on web or without permission)
  components/  Shared UI: pill button, segmented control, stepper, number field, card
  engine/      Dosing engine: pure TypeScript, no React or Expo imports
  lib/         Pure helpers: volume calculator, number parsing, pool form logic
  state/       React context: pool, tests, settings (applies sun mode), reminders sync
  storage/     Local storage: pool profile and test history repositories
  theme.ts     Normal and sun mode palettes, makeStyles, fonts, radii and spacing
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

## Home

One water health card:

- A big status: "Crystal clear, go jump in", "Needs a tweak", "Act now", "Clearly sorted" once every plan step is ticked, or "Your pool might be getting ideas" when the last test is 10 or more days old.
- When you last tested, with a lime, coral or red dot.
- A water level that rises and settles with water health (higher is healthier). The animation is a short ease-out with no bounce, and is skipped when Reduce Motion is on.
- One clear next action: the first unticked dose step ("Add 230 mL chlorine", or "Next: ..." with the time it's ready), "Test the rest" if readings were skipped, or "Test water" with when the next test is due.
- A plain no-swimming line on the card when chlorine is above 10 ppm.

The logic is in `src/lib/homeSummary.ts` and tested separately from the card.

## Test screen

- Each reading starts as "Not tested". Tap **Add reading** to start it at the last test's value (or the ideal on the first test).
- Big − / + buttons step by test-kit resolution (FC 0.5, pH 0.1, TA and CYA 10). Hold to keep stepping, or tap the number to type it.
- A low / ideal / high bar shows where each value sits, with a short line underneath. The chlorine bar moves with the stabiliser reading. Lime is ideal, coral is adjust, and deep red is kept for act-now and safety cases (FC above 10, very low FC, pH below 7.0 or above 8.0), which use plain wording.
- Optional notes, a "Scan strip" placeholder marked coming soon, and a quick ripple on save.

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
- Nothing fires in quiet hours (default 9 pm to 7 am, set in Settings). A reminder that would land then moves to when quiet hours end.
- Can be switched off in Settings.
- Undoing a tick, finishing the plan or starting a new test cancels the pending reminder.
- Permission is only asked the first time a reminder is needed. Notifications don't run on web.

## History screen

- Trend lines for free chlorine and pH, with alkalinity and stabiliser toggleable. Pick 30 days, 90 days or all.
- Each chart shades the ideal range in lime and marks readings outside it with coral dots. Points are spaced by date, so gaps between tests show as gaps. The chlorine band uses the most recent stabiliser reading.
- Charts are drawn with `react-native-svg` (bundled in Expo Go), no chart library.
- Past tests, newest first: date, a status pill, the four readings (out-of-range ones in coral or red) and notes. Tap a test to see its plan (latest test only), add or edit its note, or delete it with a confirm step. Deleting a test also cancels any reminder its plan had pending.

## Settings

- **Pool and products:** links to the pool profile screen.
- **Test reminders:** on by default, twice a week in summer (November to March) and once a week in winter, on Wednesday and Saturday (once: Saturday; three times: Monday, Wednesday, Saturday). Choose once, twice or three times for each season, at 8 am or 6 pm.
- **Dose follow-ups** and the **overdue check-in** can each be switched off.
- **Quiet hours:** default 9 pm to 7 am, set by the hour.
- **Sun mode:** a high-contrast palette (darker text and accents, pure white, strong borders) for reading outdoors. It applies across the whole app.
- If notifications are blocked on the phone, Settings says so and offers to ask again.

### How test and overdue reminders are scheduled

`src/lib/reminderSchedule.ts` plans the next four weeks, and the app reschedules whenever tests or settings change (and at start-up):

- No test reminder on the day of a test or the day after.
- One overdue nudge 10 days after the last test ("Your pool might be getting ideas"), then it backs off: no more test or overdue reminders until the next test.
- At most one of these a day (the overdue nudge wins). Dose follow-ups you started are separate.
- Nothing during quiet hours.
- Permission is first asked after you save a test, or when you switch a reminder on.

### Theming

Styles are written with `makeStyles((colours) => ({ ... }))` and used with `const styles = useStyles()`, so every screen follows the active palette. Status and severity colours come from `statusColours`, `severityFill` and `severityInk` in `theme.ts`.

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
