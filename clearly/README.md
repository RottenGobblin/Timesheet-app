# Clearly

Pool care app for Australian home pool owners. Test your water, get exact doses, get reminded at the right time.

Built with Expo (SDK 58), React Native, TypeScript and Expo Router.

> **Status:** project scaffold and dosing engine are done and tested. Screens, storage and reminders come next.

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
```

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
  app/        Expo Router routes (placeholder Home screen for now)
  engine/     Dosing engine: pure TypeScript, no React or Expo imports
```

ESLint blocks React and Expo imports inside `src/engine/`, so the engine stays reusable on web or a backend later.

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
