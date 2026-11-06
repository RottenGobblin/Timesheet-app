import { Pressable, StyleSheet, Text, View } from 'react-native';

import { colours, fonts, radius, TAP } from '../theme';

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
}

interface Props<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange(value: T): void;
  accessibilityLabel: string;
}

/** Big, thumb-friendly single choice. */
export function Segmented<T extends string>({ options, value, onChange, accessibilityLabel }: Props<T>) {
  return (
    <View style={styles.row} accessibilityRole="radiogroup" accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
            onPress={() => onChange(o.value)}
            style={[styles.option, selected && styles.selected]}
          >
            <Text style={[styles.label, selected && styles.selectedLabel]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    backgroundColor: colours.primarySoft,
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
  },
  option: {
    flex: 1,
    minHeight: TAP - 8,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  selected: { backgroundColor: colours.primary },
  label: { fontFamily: fonts.bodySemi, fontSize: 16, color: colours.primaryDark },
  selectedLabel: { color: colours.surface },
});
