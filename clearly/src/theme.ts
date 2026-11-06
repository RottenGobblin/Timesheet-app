/** "Pool party" palette and shared design tokens. */
export const colours = {
  background: '#FAFAF7',
  surface: '#FFFFFF',
  primary: '#1A9FE0',
  primaryDark: '#0E7DB5',
  primarySoft: '#E3F3FC',
  success: '#B6E84A',
  successInk: '#3F5A0B',
  warning: '#FF7A59',
  /** Reserved for "act now" and safety warnings only. */
  danger: '#C62828',
  dangerSoft: '#FDECEC',
  ink: '#14213D',
  inkMuted: '#5A6478',
  border: '#E3E5EA',
} as const;

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
