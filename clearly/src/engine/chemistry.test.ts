import { describe, expect, it } from 'vitest';
import {
  acidNeededEqPerL,
  addAcid,
  addBicarb,
  addSodaAsh,
  dryAcidGramsForMoles,
  hclDensity,
  hclMlForMoles,
  phOf,
  PPM_CACO3_PER_EQ,
  sodaAshNeededMolPerL,
  taPpm,
  waterFromReadings,
} from './chemistry';

describe('carbonate model', () => {
  it('reproduces the measured TA and pH', () => {
    const w = waterFromReadings(7.6, 90, 40);
    expect(taPpm(w)).toBeCloseTo(90, 6);
    expect(phOf(w)).toBeCloseTo(7.6, 6);
  });

  it('needs no acid when already at or below the target pH', () => {
    expect(acidNeededEqPerL(waterFromReadings(7.4, 80, 40), 7.4)).toBeCloseTo(0, 12);
    expect(acidNeededEqPerL(waterFromReadings(7.2, 80, 40), 7.4)).toBe(0);
  });

  it('lands on the target pH after adding the acid it asks for', () => {
    const w = waterFromReadings(7.9, 80, 40);
    const after = addAcid(w, acidNeededEqPerL(w, 7.4));
    expect(phOf(after)).toBeCloseTo(7.4, 4);
  });

  it('needs more acid when alkalinity is higher', () => {
    const low = acidNeededEqPerL(waterFromReadings(7.9, 60, 40), 7.4);
    const high = acidNeededEqPerL(waterFromReadings(7.9, 120, 40), 7.4);
    expect(high).toBeGreaterThan(low * 1.5);
  });

  it('raises pH when bicarb is added to low-pH water', () => {
    const w = waterFromReadings(7.0, 40, 40);
    const after = addBicarb(w, 40 / PPM_CACO3_PER_EQ);
    expect(taPpm(after)).toBeCloseTo(80, 6);
    expect(phOf(after)).toBeGreaterThan(7.1);
    expect(phOf(after)).toBeLessThan(7.6);
  });

  it('solves soda ash to hit the target pH', () => {
    const w = waterFromReadings(6.9, 80, 40);
    const mol = sodaAshNeededMolPerL(w, 7.4);
    expect(mol).toBeGreaterThan(0);
    expect(phOf(addSodaAsh(w, mol))).toBeCloseTo(7.4, 4);
    expect(sodaAshNeededMolPerL(waterFromReadings(7.5, 80, 40), 7.4)).toBe(0);
  });
});

describe('acid products', () => {
  it('estimates hydrochloric acid density from strength', () => {
    expect(hclDensity(32)).toBeCloseTo(1.16, 6);
  });

  it('converts moles of H+ to mL of hydrochloric acid', () => {
    // 1 mol HCl = 36.46 g; 32% at 1.16 g/mL gives 0.3712 g HCl per mL
    expect(hclMlForMoles(1, 32)).toBeCloseTo(36.46 / (1.16 * 0.32), 6);
  });

  it('converts moles of H+ to grams of dry acid', () => {
    expect(dryAcidGramsForMoles(1, 93)).toBeCloseTo(120.06 / 0.93, 6);
  });
});
