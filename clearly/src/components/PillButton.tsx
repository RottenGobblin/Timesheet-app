import { Pressable, Text, type StyleProp, type ViewStyle } from 'react-native';

import { fonts, makeStyles, radius, TAP, useColours } from '../theme';

interface Props {
  label: string;
  onPress(): void;
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function PillButton({ label, onPress, variant = 'primary', disabled, style }: Props) {
  const styles = useStyles();
  const colours = useColours();
  const primary = variant === 'primary';
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => [
        styles.base,
        primary ? styles.primary : styles.secondary,
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        disabled && { opacity: 0.5 },
        style,
      ]}
    >
      <Text style={[styles.label, { color: primary ? colours.surface : colours.primaryDark }]}>{label}</Text>
    </Pressable>
  );
}

const useStyles = makeStyles((colours) => ({
  base: {
    minHeight: TAP,
    borderRadius: radius.pill,
    paddingHorizontal: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primary: { backgroundColor: colours.primary },
  secondary: { backgroundColor: colours.primarySoft },
  label: { fontFamily: fonts.headingSemi, fontSize: 18 },
}));
