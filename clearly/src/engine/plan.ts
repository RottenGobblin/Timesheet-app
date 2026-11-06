import {
  addAcid,
  addBicarb,
  acidNeededEqPerL,
  dryAcidGramsForMoles,
  hclMlForMoles,
  MOLAR_MASS,
  phOf,
  PPM_CACO3_PER_EQ,
  sodaAshNeededMolPerL,
  taPpm,
  waterFromReadings,
  type WaterChemistry,
} from './chemistry';
import {
  NO_SWIM_FC,
  REPORT_TA_DROP_PPM,
  STABILISER_RETEST_DAYS,
  WAIT_HOURS,
} from './defaults';
import {
  bicarbGrams,
  drainPercentForStabiliser,
  granularChlorineGrams,
  liquidChlorineMl,
  stabiliserGrams,
} from './doses';
import { toAmount } from './rounding';
import { getTargets } from './targets';
import type {
  DosePlan,
  DoseStep,
  PoolProfile,
  ReadingKey,
  Readings,
  Targets,
  Warning,
  WaterStatus,
} from './types';
import { READING_LABELS, validateProfile, validateReadings } from './validate';

const ALL_READINGS: ReadingKey[] = ['fc', 'ph', 'ta', 'cya'];

/** pH outside this window is an "act now". */
const PH_ACT_LOW = 7.0;
const PH_ACT_HIGH = 8.0;

/**
 * Work out an ordered dose plan from a water test.
 *
 * Order: alkalinity, then pH (recalculated after any bicarb), then stabiliser,
 * then chlorine last in the evening. Very high stabiliser short-circuits to a
 * drain-and-refill step, since other doses would be wasted until that's done.
 */
export function buildDosePlan(profile: PoolProfile, readings: Readings): DosePlan {
  const missing = ALL_READINGS.filter((k) => readings[k] === undefined);
  const errors = [...validateProfile(profile), ...validateReadings(readings)];
  const targets = getTargets(profile, readings.cya);

  if (errors.length > 0) {
    return { status: 'tweak', steps: [], warnings: [], missing, errors, targets };
  }

  const V = profile.volumeLitres;
  const { fc, ph, ta, cya } = readings;
  const steps: DoseStep[] = [];
  const warnings: Warning[] = [];

  if (missing.length > 0) {
    warnings.push({
      code: 'missing-readings',
      severity: 'info',
      message: `Not tested: ${missing.map((k) => READING_LABELS[k]).join(', ')}. The plan only covers what was tested.`,
    });
  }

  // Stabiliser used for the maths. If it wasn't tested, assume the ideal for this pool.
  const cyaForMaths = cya ?? targets.cya.ideal;
  if (cya === undefined && (fc !== undefined || (ph !== undefined && ta !== undefined))) {
    warnings.push({
      code: 'assumed-stabiliser',
      severity: 'info',
      message: `Stabiliser wasn't tested, so the maths assumes ${targets.cya.ideal} ppm. Test it for a more accurate plan.`,
    });
  }

  // High stabiliser: drain first, then retest. Other doses can wait.
  if (cya !== undefined && cya > targets.cya.max) {
    const aimFor = targets.cya.ideal > 0 ? targets.cya.ideal : targets.cya.max / 2;
    const pct = Math.round(drainPercentForStabiliser(cya, aimFor));
    steps.push({
      kind: 'drain',
      reading: 'cya',
      chemical: 'Fresh water',
      drainPercent: pct,
      from: cya,
      to: aimFor,
      why: 'Stabiliser is too high, which locks up your chlorine so it works much more slowly. The only way to bring it down is to swap out some water.',
      how: `Drain about ${pct}% of the pool, then refill with fresh water. Check your local water restrictions first, and drain to stormwater or sewer as your council requires.`,
      waitHours: 0,
      notes: [],
    });
    warnings.push({
      code: 'retest-after-drain',
      severity: 'info',
      message: 'Retest everything once the pool is refilled and has circulated for a few hours. The other readings will have changed.',
    });
    if (fc !== undefined && fc < targets.fc.min) {
      warnings.push({
        code: 'low-chlorine-before-drain',
        severity: 'info',
        message: `Until the pool is refilled, chlorine works slowly at this stabiliser level. Keep free chlorine at ${targets.fc.min} ppm or above in the meantime.`,
      });
    }
    pushFcSafetyWarnings(fc, targets, warnings);
    return finish(steps, warnings, missing, errors, targets, readings);
  }

  // 1. Alkalinity
  let water: WaterChemistry | undefined =
    ph !== undefined && ta !== undefined ? waterFromReadings(ph, ta, cyaForMaths) : undefined;

  if (ta !== undefined && ta < targets.ta.min) {
    const delta = targets.ta.ideal - ta;
    const amount = toAmount(bicarbGrams(delta, V), 'g');
    const notes: string[] = [];
    if (water) {
      const before = phOf(water);
      water = addBicarb(water, delta / PPM_CACO3_PER_EQ);
      const after = phOf(water);
      if (after - before >= 0.05) {
        notes.push(`This will nudge pH up to about ${after.toFixed(1)}. Any pH step below already allows for it.`);
      }
    } else if (ph === undefined) {
      notes.push('Bicarb raises pH a little, so test pH after the wait.');
    }
    steps.push({
      kind: 'raise-alkalinity',
      reading: 'ta',
      chemical: 'Sodium bicarbonate (bicarb soda, buffer)',
      amount,
      from: ta,
      to: targets.ta.ideal,
      why: 'Alkalinity is low, so your pH will bounce around. Bicarb steadies it.',
      how: 'With the pump running, sprinkle it evenly across the surface, mostly over the deep end. Brush any that settles. Large doses can go in two halves a few hours apart.',
      waitHours: WAIT_HOURS.alkalinity,
      notes,
    });
  } else if (ta !== undefined && ta > targets.ta.max) {
    warnings.push({
      code: 'high-alkalinity',
      severity: 'info',
      message: `Alkalinity is high (${ta} ppm). It comes down slowly: lower pH with acid to about 7.2, aerate (point returns up, run water features) to let pH rise again, and repeat over days or weeks.`,
    });
  }

  // 2. pH (needs alkalinity for an accurate dose)
  if (ph !== undefined && ta === undefined) {
    if (ph < targets.ph.min || ph > targets.ph.max) {
      warnings.push({
        code: 'need-alkalinity-for-ph',
        severity: 'info',
        message: 'pH is out of range, but the dose depends on alkalinity. Test alkalinity and we can work out the exact amount.',
      });
    }
  } else if (water) {
    const phNow = phOf(water);
    const phLabel = round1(phNow);
    const predicted = steps.length > 0;

    if (phNow > targets.ph.max + 0.001) {
      const eqPerL = acidNeededEqPerL(water, targets.ph.ideal);
      const moles = eqPerL * V;
      const taDrop = eqPerL * PPM_CACO3_PER_EQ;
      water = addAcid(water, eqPerL);
      const notes: string[] = [];
      if (taDrop >= REPORT_TA_DROP_PPM) {
        notes.push(`This will also lower alkalinity by about ${Math.round(taDrop)} ppm (to about ${Math.round(taPpm(water))} ppm).`);
      }
      if (predicted) notes.push(`Based on the expected pH after the step above (about ${phLabel}).`);
      steps.push(acidStep(profile, moles, phLabel, targets.ph.ideal, notes));
    } else if (phNow < targets.ph.min - 0.001) {
      const molPerL = sodaAshNeededMolPerL(water, targets.ph.ideal);
      const grams = molPerL * V * MOLAR_MASS.sodaAsh;
      const taRise = 2 * molPerL * PPM_CACO3_PER_EQ;
      const notes: string[] = [];
      if (taRise >= REPORT_TA_DROP_PPM) {
        notes.push(`This will also raise alkalinity by about ${Math.round(taRise)} ppm.`);
      }
      if (predicted) notes.push(`Based on the expected pH after the step above (about ${phLabel}).`);
      steps.push({
        kind: 'raise-ph',
        reading: 'ph',
        chemical: 'Soda ash (sodium carbonate, pH up)',
        amount: toAmount(grams, 'g'),
        from: phLabel,
        to: targets.ph.ideal,
        why: 'pH is low, which can sting eyes and corrode metal fittings.',
        how: 'Dissolve in a bucket of pool water, then pour slowly around the edge with the pump running. The water may go cloudy for a short while.',
        waitHours: WAIT_HOURS.ph,
        notes,
      });
    }
  }

  // 3. Stabiliser
  if (cya !== undefined && cya < targets.cya.min) {
    const delta = targets.cya.ideal - cya;
    steps.push({
      kind: 'raise-stabiliser',
      reading: 'cya',
      chemical: 'Stabiliser (cyanuric acid)',
      amount: toAmount(stabiliserGrams(delta, V), 'g'),
      from: cya,
      to: targets.cya.ideal,
      why: 'Stabiliser shields chlorine from the sun. Without enough, chlorine burns off within hours on a sunny day.',
      how: 'Put it in an old sock or stocking and hang it in the skimmer basket with the pump running. Squeeze it now and then until it has all dissolved. Don’t backwash or clean the filter for a week.',
      waitHours: 0,
      retestAfterDays: STABILISER_RETEST_DAYS,
      notes: ['It dissolves slowly, so don’t retest stabiliser for a week.'],
    });
  }

  // 4. Chlorine, last, in the evening
  if (fc !== undefined && fc < targets.fc.min) {
    const delta = targets.fc.ideal - fc;
    const veryLow = fc < targets.fc.min / 2;
    const why = veryLow
      ? `Chlorine is too low to keep the water safe. Bring it up to ${targets.fc.ideal} ppm.`
      : `Your chlorine’s having a lazy day. Bringing it up to ${targets.fc.ideal} ppm keeps the water sanitised.`;
    const notes: string[] = [];
    if (profile.sanitiser === 'granular') {
      steps.push({
        kind: 'raise-chlorine',
        reading: 'fc',
        chemical: `Granular chlorine (${profile.strengths.granularChlorinePct}%)`,
        amount: toAmount(granularChlorineGrams(delta, V, profile.strengths.granularChlorinePct), 'g'),
        from: fc,
        to: targets.fc.ideal,
        why,
        how: 'In the evening, dissolve it in a bucket of pool water (always add chlorine to water, never water to chlorine) and pour in front of a return jet with the pump running.',
        waitHours: 0,
        bestTime: 'evening',
        notes,
      });
    } else {
      if (profile.sanitiser === 'salt') {
        notes.push('This is a quick top-up. Also check the chlorinator is on and its output is high enough.');
        warnings.push({
          code: 'salt-chlorinator',
          severity: 'info',
          message: 'Chlorine is low for a salt pool. Check the chlorinator is running, the cell is clean and the output setting is high enough.',
        });
      }
      steps.push({
        kind: 'raise-chlorine',
        reading: 'fc',
        chemical: `Liquid chlorine (${profile.strengths.liquidChlorinePct}%)`,
        amount: toAmount(liquidChlorineMl(delta, V, profile.strengths.liquidChlorinePct), 'mL'),
        from: fc,
        to: targets.fc.ideal,
        why,
        how: 'In the evening, with the pump running, pour it slowly in front of a return jet, keeping the bottle low to the water to avoid splashes.',
        waitHours: 0,
        bestTime: 'evening',
        notes,
      });
    }
  }

  pushFcSafetyWarnings(fc, targets, warnings);

  const hasAcid = steps.some((s) => s.kind === 'lower-ph' || s.kind === 'raise-stabiliser');
  const hasChlorine = steps.some((s) => s.kind === 'raise-chlorine');
  if (hasAcid && hasChlorine) {
    warnings.unshift({
      code: 'never-mix-acid-chlorine',
      severity: 'safety',
      message: 'Never mix acid and chlorine, or add them in the same spot together. They release toxic chlorine gas. Leave hours between them and use separate buckets and measuring jugs.',
    });
  }

  return finish(steps, warnings, missing, errors, targets, readings);
}

function acidStep(
  profile: PoolProfile,
  moles: number,
  from: number,
  to: number,
  notes: string[],
): DoseStep {
  const s = profile.strengths;
  const base = {
    kind: 'lower-ph' as const,
    reading: 'ph' as const,
    from,
    to,
    why: 'pH is high, which makes chlorine work less well and can lead to scale and cloudy water.',
    waitHours: WAIT_HOURS.ph,
    notes,
  };
  if (s.acidType === 'dryAcid') {
    return {
      ...base,
      chemical: `Dry acid (sodium bisulfate, ${s.dryAcidPurityPct}%)`,
      amount: toAmount(dryAcidGramsForMoles(moles, s.dryAcidPurityPct), 'g'),
      how: 'Wear gloves and eye protection. Dissolve it in a bucket of pool water, then pour slowly into the deep end, away from the skimmer, with the pump running.',
    };
  }
  return {
    ...base,
    chemical: `Hydrochloric acid (pool acid, ${s.hydrochloricAcidPct}%)`,
    amount: toAmount(hclMlForMoles(moles, s.hydrochloricAcidPct), 'mL'),
    how: 'Wear gloves and eye protection. With the pump running, pour slowly into the deep end, away from the skimmer, keeping the bottle low to the water. If you dilute it first, add the acid to a bucket of pool water, never water to acid.',
  };
}

function pushFcSafetyWarnings(fc: number | undefined, targets: Targets, warnings: Warning[]): void {
  if (fc === undefined) return;
  if (fc > NO_SWIM_FC) {
    warnings.push({
      code: 'no-swimming-high-chlorine',
      severity: 'safety',
      message: `Chlorine is above ${NO_SWIM_FC} ppm. No swimming until it drops. Leave the cover off and let the sun bring it down.`,
    });
  } else if (fc > targets.fc.max) {
    warnings.push({
      code: 'high-chlorine',
      severity: 'info',
      message: `Chlorine is on the high side (${fc} ppm). Hold off adding more and let it come down on its own.`,
    });
  }
}

function finish(
  steps: DoseStep[],
  warnings: Warning[],
  missing: ReadingKey[],
  errors: DosePlan['errors'],
  targets: Targets,
  readings: Readings,
): DosePlan {
  return { status: statusFor(readings, targets, steps, warnings, missing), steps, warnings, missing, errors, targets };
}

function statusFor(
  readings: Readings,
  targets: Targets,
  steps: DoseStep[],
  warnings: Warning[],
  missing: ReadingKey[],
): WaterStatus {
  const { fc, ph } = readings;
  if (fc !== undefined && (fc > NO_SWIM_FC || fc < targets.fc.min / 2)) return 'act';
  if (ph !== undefined && (ph < PH_ACT_LOW || ph > PH_ACT_HIGH)) return 'act';
  const flagged = warnings.some((w) => w.code === 'high-alkalinity' || w.code === 'high-chlorine');
  if (steps.length > 0 || missing.length > 0 || flagged) return 'tweak';
  return 'clear';
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
