import { useEffect, useRef } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';

import { colours, fonts, radius, TAP } from '../theme';

interface Props {
  symbol: string;
  accessibilityLabel: string;
  onStep(): void;
  disabled?: boolean;
  size?: number;
}

const HOLD_DELAY = 350;
const REPEAT_EVERY = 90;

/** Round − / + button. Tap to step once, hold to keep stepping. */
export function RepeatButton({ symbol, accessibilityLabel, onStep, disabled, size = TAP + 8 }: Props) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(onStep);
  useEffect(() => {
    latest.current = onStep;
  }, [onStep]);

  function stop() {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
  }

  function repeat() {
    latest.current();
    timer.current = setTimeout(repeat, REPEAT_EVERY);
  }

  useEffect(() => stop, []);
  useEffect(() => {
    if (disabled) stop();
  }, [disabled]);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      hitSlop={6}
      onPress={() => latest.current()}
      delayLongPress={HOLD_DELAY}
      onLongPress={repeat}
      onPressOut={stop}
      style={({ pressed }) => [
        styles.button,
        { width: size, height: size },
        pressed && { backgroundColor: colours.primaryDark, transform: [{ scale: 0.96 }] },
        disabled && { opacity: 0.35 },
      ]}
    >
      <Text style={styles.symbol}>{symbol}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    borderRadius: radius.pill,
    backgroundColor: colours.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  symbol: { fontFamily: fonts.heading, fontSize: 32, color: colours.surface, lineHeight: 36 },
});
