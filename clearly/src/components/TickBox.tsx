import { Pressable, Text } from 'react-native';

import { fonts, makeStyles, radius, TAP } from '../theme';

interface Props {
  checked: boolean;
  disabled?: boolean;
  onPress(): void;
  accessibilityLabel: string;
}

export function TickBox({ checked, disabled, onPress, accessibilityLabel }: Props) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked, disabled }}
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      disabled={disabled}
      hitSlop={8}
      style={({ pressed }) => [
        styles.box,
        checked && styles.checked,
        disabled && !checked && styles.disabled,
        pressed && { transform: [{ scale: 0.94 }] },
      ]}
    >
      {checked ? <Text style={styles.tick}>✓</Text> : null}
    </Pressable>
  );
}

const useStyles = makeStyles((colours) => ({
  box: {
    width: TAP,
    height: TAP,
    borderRadius: radius.input,
    borderWidth: 3,
    borderColor: colours.primary,
    backgroundColor: colours.surface,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checked: { backgroundColor: colours.success, borderColor: colours.success },
  disabled: { borderColor: colours.border, backgroundColor: colours.background },
  tick: { fontFamily: fonts.heading, fontSize: 30, color: colours.ink, lineHeight: 34 },
}));
