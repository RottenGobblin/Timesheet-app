import { Pressable, Text, View } from 'react-native';

import { stepValue } from '../lib/number';
import { fonts, makeStyles, radius, TAP, useColours } from '../theme';

interface Props {
  label: string;
  value: number;
  onChange(value: number): void;
  step: number;
  min: number;
  max: number;
  unit?: string;
  hint?: string;
  error?: string;
}

/** Large − / + stepper for values that rarely change, like product strengths. */
export function Stepper({ label, value, onChange, step, min, max, unit = '', hint, error }: Props) {
  const styles = useStyles();
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.row}>
        <StepButton symbol="−" label={`Decrease ${label}`} onPress={() => onChange(stepValue(value, -step, min, max))} disabled={value <= min} />
        <Text style={styles.value} accessibilityLiveRegion="polite">
          {value}
          {unit}
        </Text>
        <StepButton symbol="+" label={`Increase ${label}`} onPress={() => onChange(stepValue(value, step, min, max))} disabled={value >= max} />
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

function StepButton({ symbol, label, onPress, disabled }: { symbol: string; label: string; onPress(): void; disabled: boolean }) {
  const styles = useStyles();
  const colours = useColours();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [styles.button, pressed && { backgroundColor: colours.primaryDark }, disabled && { opacity: 0.4 }]}
    >
      <Text style={styles.symbol}>{symbol}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colours) => ({
  wrap: { gap: 8 },
  label: { fontFamily: fonts.bodySemi, fontSize: 16, color: colours.ink },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  button: {
    width: TAP,
    height: TAP,
    borderRadius: radius.pill,
    backgroundColor: colours.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { fontFamily: fonts.heading, fontSize: 28, color: colours.surface, lineHeight: 32 },
  value: { fontFamily: fonts.bodySemi, fontSize: 28, color: colours.ink, fontVariant: ['tabular-nums'] },
  hint: { fontFamily: fonts.body, fontSize: 14, color: colours.inkMuted },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colours.danger },
}));
