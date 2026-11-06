/**
 * Carbonate equilibrium model for pH and alkalinity changes.
 *
 * Total alkalinity (TA) from a test kit is mostly carbonate alkalinity plus a share
 * from cyanurate (stabiliser). Following the brief:
 *   carbonate alkalinity = TA − CYA ÷ 3
 * and total carbonate (C_T) is held constant when acid is added, so the acid needed is
 * the alkalinity now minus the alkalinity at the target pH.
 *
 * On top of the brief's model, cyanurate buffering is included as a change term: as pH
 * falls, some cyanurate takes up H+ too, which soaks up a little extra acid. At the
 * current pH the model still reproduces TA exactly, so the TA − CYA ÷ 3 rule holds.
 *
 * Units inside this file: concentrations in mol/L, alkalinity in eq/L.
 */

export const PK1 = 6.3;
export const PK2 = 10.25;
export const PKW = 14.0;
/** First dissociation of cyanuric acid. */
export const PK_CYA = 6.88;

const K1 = 10 ** -PK1;
const K2 = 10 ** -PK2;
const KW = 10 ** -PKW;
const K_CYA = 10 ** -PK_CYA;

/** mg/L as CaCO3 per eq/L. */
export const PPM_CACO3_PER_EQ = 50_000;

export const MOLAR_MASS = {
  cyanuricAcid: 129.07,
  hcl: 36.46,
  sodiumBisulfate: 120.06,
  sodaAsh: 105.99,
  sodiumBicarbonate: 84.01,
} as const;

export interface WaterChemistry {
  /** Total carbonate, mol/L. */
  ct: number;
  /** Total alkalinity, eq/L. */
  alk: number;
  /** Total cyanuric acid, mol/L. */
  cyaTotal: number;
  /** Fixed cyanurate alkalinity from the TA − CYA ÷ 3 rule, eq/L. */
  cyaAlkRef: number;
  /** Fraction of cyanuric acid deprotonated at the reference pH. */
  cyaFractionRef: number;
}

function hFromPh(ph: number): number {
  return 10 ** -ph;
}

function carbonateFactor(h: number): number {
  // α1 + 2·α2: equivalents of alkalinity per mole of total carbonate
  const d = h * h + K1 * h + K1 * K2;
  return (K1 * h + 2 * K1 * K2) / d;
}

function cyaFraction(h: number): number {
  return K_CYA / (h + K_CYA);
}

/** Alkalinity (eq/L) the water would have at a given pH, holding its totals constant. */
export function alkalinityAtPh(w: WaterChemistry, ph: number): number {
  const h = hFromPh(ph);
  return (
    w.ct * carbonateFactor(h) +
    KW / h -
    h +
    w.cyaAlkRef +
    w.cyaTotal * (cyaFraction(h) - w.cyaFractionRef)
  );
}

/** Build the model from test readings (ppm). */
export function waterFromReadings(ph: number, ta: number, cya: number): WaterChemistry {
  const h = hFromPh(ph);
  const cyaAlkRef = cya / 3 / PPM_CACO3_PER_EQ;
  const carbonateAlk = Math.max(ta - cya / 3, 0) / PPM_CACO3_PER_EQ;
  const ct = Math.max((carbonateAlk - (KW / h - h)) / carbonateFactor(h), 0);
  const cyaTotal = cya / MOLAR_MASS.cyanuricAcid / 1000;
  const w: WaterChemistry = { ct, alk: 0, cyaTotal, cyaAlkRef, cyaFractionRef: cyaFraction(h) };
  w.alk = alkalinityAtPh(w, ph);
  return w;
}

/** Solve for the pH that matches the water's alkalinity and carbonate. */
export function phOf(w: WaterChemistry): number {
  let lo = 3;
  let hi = 12;
  // Alkalinity rises with pH, so bisection is safe.
  for (let i = 0; i < 80; i++) {
    const mid = (lo + hi) / 2;
    if (alkalinityAtPh(w, mid) < w.alk) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

export function taPpm(w: WaterChemistry): number {
  return w.alk * PPM_CACO3_PER_EQ;
}

/** Acid (eq/L of H+) needed to bring pH down to the target. Zero if already at or below. */
export function acidNeededEqPerL(w: WaterChemistry, targetPh: number): number {
  return Math.max(w.alk - alkalinityAtPh(w, targetPh), 0);
}

/** Water after adding strong acid (eq/L). Carbonate stays, alkalinity drops. */
export function addAcid(w: WaterChemistry, eqPerL: number): WaterChemistry {
  return { ...w, alk: w.alk - eqPerL };
}

/** Water after adding sodium bicarbonate: +1 mol carbonate and +1 eq alkalinity per mol. */
export function addBicarb(w: WaterChemistry, molPerL: number): WaterChemistry {
  return { ...w, ct: w.ct + molPerL, alk: w.alk + molPerL };
}

/** Water after adding soda ash: +1 mol carbonate and +2 eq alkalinity per mol. */
export function addSodaAsh(w: WaterChemistry, molPerL: number): WaterChemistry {
  return { ...w, ct: w.ct + molPerL, alk: w.alk + 2 * molPerL };
}

/** Soda ash (mol/L) needed to lift pH to the target, solved numerically. */
export function sodaAshNeededMolPerL(w: WaterChemistry, targetPh: number): number {
  if (phOf(w) >= targetPh) return 0;
  let hi = 1e-5;
  while (phOf(addSodaAsh(w, hi)) < targetPh) {
    hi *= 2;
    if (hi > 1) return Number.POSITIVE_INFINITY;
  }
  let lo = 0;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (phOf(addSodaAsh(w, mid)) < targetPh) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Density of hydrochloric acid (g/mL) from its % w/w strength. */
export function hclDensity(strengthPct: number): number {
  return 1 + 0.005 * strengthPct;
}

/** mL of hydrochloric acid that supplies the given moles of H+. */
export function hclMlForMoles(moles: number, strengthPct: number): number {
  const molPerMl = (hclDensity(strengthPct) * (strengthPct / 100)) / MOLAR_MASS.hcl;
  return moles / molPerMl;
}

/** Grams of dry acid (sodium bisulfate) that supply the given moles of H+. */
export function dryAcidGramsForMoles(moles: number, purityPct: number): number {
  return (moles * MOLAR_MASS.sodiumBisulfate) / (purityPct / 100);
}
