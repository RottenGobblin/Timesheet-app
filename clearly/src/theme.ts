import { createContext, useContext } from 'react';
import { StyleSheet, type ImageStyle, type TextStyle, type ViewStyle } from 'react-native';

/** "Pool party" palette. */
const normal = {
  background: '#FAFAF7',
  surface: '#FFFFFF',
  primary: '#1A9FE0',
  primaryDark: '#0E7DB5',
  primarySoft: '#E3F3FC',
  success: '#B6E84A',
  successInk: '#3F5A0B',
  successSoft: '#F4FBE6',
  warning: '#FF7A59',
  /** Coral is too light for text on white; use this for coral messages. */
  warningInk: '#B23F1E',
  warningSoft: '#FFD3C7',
  /** Reserved for "act now" and safety warnings only. */
  danger: '#C62828',
  dangerSoft: '#FDECEC',
  ink: '#14213D',
  inkMuted: '#5A6478',
  border: '#E3E5EA',
  /** Background for disabled or placeholder controls. */
  muted: '#E3E5EA',
};

export type Colours = typeof normal;

/**
 * Sun mode: high contrast for reading outdoors in glare. Same hues, but darker text and
 * accents, pure white surfaces and strong borders so nothing washes out.
 */
const sun: Colours = {
  background: '#FFFFFF',
  surface: '#FFFFFF',
  primary: '#005C99',
  primaryDark: '#00406B',
  primarySoft: '#D2E9F8',
  success: '#A4DB2E',
  successInk: '#223303',
  successSoft: '#EDF8D4',
  warning: '#F2542D',
  warningInk: '#7F2410',
  warningSoft: '#FFC4B3',
  danger: '#A30D0D',
  dangerSoft: '#FCDADA',
  ink: '#000000',
  inkMuted: '#1F2633',
  border: '#14213D',
  muted: '#DADDE3',
};

export const palettes = { normal, sun } as const;

const ThemeContext = createContext<Colours>(normal);
export const ThemeColoursProvider = ThemeContext.Provider;

/** The active palette (normal or sun mode). */
export function useColours(): Colours {
  return useContext(ThemeContext);
}

/**
 * Theme-aware styles: write styles as a function of the palette, then call the returned
 * hook in the component. Each palette's stylesheet is built once and cached.
 */
type NamedStyles = Record<string, ViewStyle | TextStyle | ImageStyle>;

export function makeStyles<T extends NamedStyles>(factory: (c: Colours) => T & NamedStyles): () => T {
  const cache = new Map<Colours, T>();
  return function useStyles(): T {
    const c = useColours();
    const cached = cache.get(c);
    if (cached) return cached;
    const styles = StyleSheet.create(factory(c)) as T;
    cache.set(c, styles);
    return styles;
  };
}

export const fonts = {
  heading: 'Nunito_800ExtraBold',
  headingSemi: 'Nunito_700Bold',
  body: 'Inter_400Regular',
  bodyMedium: 'Inter_500Medium',
  bodySemi: 'Inter_600SemiBold',
} as const;

export const radius = {
  card: 24,
  input: 16,
  pill: 999,
} as const;

export const space = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
} as const;

/** Minimum tap target: big enough for a wet thumb. */
export const TAP = 56;

/** Short, snappy durations only. */
export const motion = {
  fast: 120,
  normal: 200,
} as const;

type StatusKey = 'clear' | 'tweak' | 'act';
type SeverityKey = 'good' | 'adjust' | 'danger';

/** Background and text colour for a water status pill or banner. */
export function statusColours(c: Colours, status: StatusKey): { bg: string; ink: string } {
  if (status === 'clear') return { bg: c.success, ink: c.successInk };
  if (status === 'tweak') return { bg: c.warningSoft, ink: c.warningInk };
  return { bg: c.dangerSoft, ink: c.danger };
}

/** Fill colour for a reading's severity (markers, dots). */
export function severityFill(c: Colours, s: SeverityKey): string {
  return s === 'good' ? c.success : s === 'adjust' ? c.warning : c.danger;
}

/** Text colour for a reading's severity, dark enough to read on white. */
export function severityInk(c: Colours, s: SeverityKey): string {
  return s === 'good' ? c.successInk : s === 'adjust' ? c.warningInk : c.danger;
}
