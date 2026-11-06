/** Sanitiser system the pool runs on. Salt pools are dosed with liquid chlorine for top-ups. */
export type Sanitiser = 'liquid' | 'granular' | 'salt';

export type PoolLocation = 'outdoor' | 'indoor';

export type AcidType = 'hydrochloric' | 'dryAcid';

export interface ProductStrengths {
  /** Liquid chlorine (sodium hypochlorite), % available chlorine. Default 12.5. */
  liquidChlorinePct: number;
  /** Granular chlorine (calcium hypochlorite), % available chlorine. Default 65. */
  granularChlorinePct: number;
  /** Which acid the owner uses to lower pH. */
  acidType: AcidType;
  /** Hydrochloric (muriatic) acid strength, % w/w. Default 32. */
  hydrochloricAcidPct: number;
  /** Dry acid (sodium bisulfate) purity, %. Default 93. */
  dryAcidPurityPct: number;
}

export interface PoolProfile {
  /** Pool volume in litres. */
  volumeLitres: number;
  sanitiser: Sanitiser;
  location: PoolLocation;
  strengths: ProductStrengths;
}

/** A water test. Any reading can be left out if it wasn't tested. All ppm except pH. */
export interface Readings {
  /** Free chlorine, ppm. */
  fc?: number;
  ph?: number;
  /** Total alkalinity, ppm as CaCO3. */
  ta?: number;
  /** Stabiliser (cyanuric acid), ppm. */
  cya?: number;
}

export type ReadingKey = keyof Readings;

export interface Range {
  min: number;
  ideal: number;
  max: number;
}

export interface Targets {
  fc: Range;
  ph: Range;
  ta: Range;
  cya: Range;
}

export type Band = 'low' | 'ideal' | 'high';

export type AmountUnit = 'mL' | 'L' | 'g' | 'kg';

export interface Amount {
  /** Rounded amount in base units (mL or g). */
  base: number;
  baseUnit: 'mL' | 'g';
  /** Value in the display unit (switches to L or kg at 1000). */
  value: number;
  unit: AmountUnit;
  /** Ready-to-show string, e.g. "230 mL" or "1.25 kg". */
  display: string;
}

export type StepKind =
  | 'raise-alkalinity'
  | 'lower-ph'
  | 'raise-ph'
  | 'raise-stabiliser'
  | 'drain'
  | 'raise-chlorine';

export interface DoseStep {
  kind: StepKind;
  reading: ReadingKey;
  /** Product name as it appears on the shelf. */
  chemical: string;
  /** Amount to add. Absent for a drain step. */
  amount?: Amount;
  /** Percentage of the pool to drain and refill (drain step only). */
  drainPercent?: number;
  /** Reading before the step (or the predicted value, after an earlier step changes it). */
  from: number;
  /** Target the step aims for. */
  to: number;
  why: string;
  how: string;
  /** Hours to wait after this step before doing the next one. */
  waitHours: number;
  /** Days before retesting this reading gives a true result. */
  retestAfterDays?: number;
  /** When in the day the step works best. */
  bestTime?: 'evening';
  /** Extra plain notes, e.g. side effects on other readings. */
  notes: string[];
}

/**
 * clear  = Crystal clear, nothing to do.
 * tweak  = Something to adjust, or a reading is missing.
 * act    = Act now: unsafe to swim or sanitiser badly off.
 */
export type WaterStatus = 'clear' | 'tweak' | 'act';

export interface ValidationIssue {
  field: ReadingKey | 'volumeLitres' | keyof ProductStrengths;
  message: string;
}

export type WarningCode =
  | 'never-mix-acid-chlorine'
  | 'no-swimming-high-chlorine'
  | 'high-alkalinity'
  | 'high-chlorine'
  | 'missing-readings'
  | 'need-alkalinity-for-ph'
  | 'assumed-stabiliser'
  | 'retest-after-drain'
  | 'low-chlorine-before-drain'
  | 'salt-chlorinator';

export interface Warning {
  code: WarningCode;
  /** Safety warnings are shown in the deeper red and never softened. */
  severity: 'safety' | 'info';
  message: string;
}

export interface DosePlan {
  status: WaterStatus;
  steps: DoseStep[];
  warnings: Warning[];
  /** Readings that weren't entered. */
  missing: ReadingKey[];
  /** Input problems. When present, no steps are given. */
  errors: ValidationIssue[];
  targets: Targets;
}
