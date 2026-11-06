import { StyleSheet, Text, TextInput, View } from 'react-native';

import { colours, fonts, radius, TAP } from '../theme';

interface Props {
  label: string;
  value: string;
  onChangeText(text: string): void;
  unit?: string;
  placeholder?: string;
  hint?: string;
  error?: string;
  decimal?: boolean;
  large?: boolean;
}

export function NumberField({ label, value, onChangeText, unit, placeholder, hint, error, decimal, large }: Props) {
  return (
    <View style={styles.wrap}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.box, error ? styles.boxError : null]}>
        <TextInput
          accessibilityLabel={label}
          value={value}
          onChangeText={onChangeText}
          keyboardType={decimal ? 'decimal-pad' : 'number-pad'}
          inputMode={decimal ? 'decimal' : 'numeric'}
          placeholder={placeholder}
          placeholderTextColor={colours.inkMuted}
          returnKeyType="done"
          style={[styles.input, large && styles.inputLarge]}
        />
        {unit ? <Text style={styles.unit}>{unit}</Text> : null}
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : hint ? <Text style={styles.hint}>{hint}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 8, flex: 1, minWidth: 0 },
  label: { fontFamily: fonts.bodySemi, fontSize: 16, color: colours.ink },
  box: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: TAP,
    borderRadius: radius.input,
    borderWidth: 2,
    borderColor: colours.border,
    backgroundColor: colours.surface,
    paddingHorizontal: 16,
  },
  boxError: { borderColor: colours.danger },
  input: { flexGrow: 1, flexShrink: 1, width: 0, minWidth: 0, fontFamily: fonts.bodySemi, fontSize: 20, color: colours.ink, paddingVertical: 12 },
  inputLarge: { fontSize: 32 },
  unit: { fontFamily: fonts.bodyMedium, fontSize: 18, color: colours.inkMuted, marginLeft: 8 },
  hint: { fontFamily: fonts.body, fontSize: 14, color: colours.inkMuted },
  error: { fontFamily: fonts.bodyMedium, fontSize: 14, color: colours.danger },
});
